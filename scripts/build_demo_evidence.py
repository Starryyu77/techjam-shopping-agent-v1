"""Generate frozen, auditable evidence JSON for the judge-facing demo website.

This script replays all 200 official public sessions through the agent with the
same evaluator logic, but captures *turn-level* trace data that the standard
report does not include: user messages, agent responses, state diffs, intent
parse results, and Top-10 recommendation lists per turn.

It also validates every piece of evidence against the frozen catalog and the
existing summary report, and writes the results as read-only JSON files that
the Guided Evidence Tour reads without any live agent or network dependency.

Usage:
    python scripts/build_demo_evidence.py [--official-root PATH]

Outputs:
    demo/evidence/manifest.json
    demo/evidence/metrics.json
    demo/evidence/dataset.json
    demo/evidence/version_comparison.json
    demo/evidence/catalog_samples.json
    demo/evidence/prompt_evolution.json
    demo/evidence/scenarios/<sample_id>.json

Fail-closed conditions (script exits non-zero):
    - metric inconsistency with source report
    - sample_id not in public split
    - parent_asin not in frozen catalog
    - duplicate or invalid recommendation IDs
    - page trace vs evaluator result mismatch
    - missing report hash or agent commit
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import random
import re
import subprocess
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def git_commit(repo: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, cwd=str(repo), timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def _fail(message: str) -> None:
    print(f"FAIL-CLOSED: {message}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# evaluator loop with turn-level trace capture
# ---------------------------------------------------------------------------

def replay_session_with_traces(
    agent,
    sample: dict,
    catalog_ids: set[str],
    categories: dict[str, list[str]],
    products: dict[str, dict],
    *,
    materialize_hidden_fields,
    initial_message,
    customer_reply,
    coarse_category,
    normalize_recommendations,
    classify_constraint,
    MAX_TURNS: int = 10,
    TOP_K: int = 10,
    ALLOWED_ATTRIBUTES: set[str],
) -> dict:
    """Replay one session and capture per-turn trace data."""
    session_id = f"trace_{sample['sample_id']}_{uuid.uuid4().hex[:8]}"
    agent.reset(session_id, sample["user_profile"])
    target = str(sample["ground_truth"]["parent_asin"])
    effective_intent_card, effective_behavior = materialize_hidden_fields(sample, products)
    effective_sample = {**sample, "intent_card": effective_intent_card, "behavior": effective_behavior}
    disclosed: set[str] = set()
    boundary_used = False
    override_applied = sample["scenario_type"] != "intent_override"
    user_message = initial_message(effective_sample, coarse_category(categories.get(target, [])), disclosed)

    turns = []
    hit_turn = None
    best_rank = None

    for turn in range(1, MAX_TURNS + 1):
        # Snapshot state BEFORE this turn
        state_before = copy.deepcopy(agent.sessions[session_id].to_dict())

        try:
            response = agent.respond(session_id, user_message, TOP_K)
        except Exception as exc:
            response = {"message": str(exc), "ask_attribute": None, "recommendations": [],
                        "intent": {}, "state": {}, "usage": {"prompt_tokens": 0, "completion_tokens": 0}}

        # Extract state AFTER
        state_after = copy.deepcopy(agent.sessions[session_id].to_dict())
        intent_data = response.get("intent", {})

        # Normalize recommendations the same way the evaluator does
        raw_recs = response.get("recommendations", [])
        ranked = normalize_recommendations(raw_recs, catalog_ids)

        # Build Top-10 with metadata
        top10 = []
        for rank_idx, asin in enumerate(ranked[:10]):
            prod = products.get(asin, {})
            top10.append({
                "rank": rank_idx + 1,
                "parent_asin": asin,
                "title": str(prod.get("title", ""))[:120],
                "price": prod.get("price"),
                "is_target": asin == target,
            })

        target_rank = None
        if override_applied and target in ranked:
            target_rank = ranked.index(target) + 1

        # Compute state diff
        state_diff = _compute_state_diff(state_before, state_after)

        turn_data = {
            "turn": turn,
            "user_message": user_message,
            "agent_message": response.get("message", ""),
            "ask_attribute": response.get("ask_attribute"),
            "intent": {
                "domain_intent": intent_data.get("domain_intent", ""),
                "dialogue_act": intent_data.get("dialogue_act", ""),
                "confidence": intent_data.get("confidence", 0),
            },
            "state_after": {
                "category": state_after.get("category"),
                "hard_constraints": state_after.get("hard_constraints", {}),
                "soft_preferences": state_after.get("soft_preferences", {}),
                "negative_constraints": state_after.get("negative_constraints", {}),
                "no_preference": state_after.get("no_preference", []),
            },
            "state_diff": state_diff,
            "top10": top10,
            "target_rank": target_rank,
            "hit": target_rank is not None,
            "candidate_pool_size": len(agent.last_results.get(session_id, [])),
        }
        turns.append(turn_data)

        # Check for hit (same logic as official evaluator)
        if override_applied and target in ranked:
            if best_rank is None or target_rank < best_rank:
                best_rank = target_rank
            hit_turn = turn
            break

        if turn == MAX_TURNS:
            break

        # Generate next user message (same as official evaluator)
        override = effective_sample.get("behavior", {}).get("override") or {}
        if not override_applied and turn + 1 == int(override.get("turn", 3)):
            override_applied = True
            new_value = str(override.get("new_value", ""))
            if new_value:
                disclosed.add(new_value)
            user_message = str(override.get("message", "Actually, please ignore my earlier preference."))
        else:
            user_message, boundary_used = customer_reply(
                effective_sample, response.get("ask_attribute"), disclosed, boundary_used
            )

    return {
        "sample_id": sample["sample_id"],
        "scenario_type": sample["scenario_type"],
        "category_bucket": sample.get("category_bucket", ""),
        "difficulty_bucket": sample.get("difficulty_bucket", ""),
        "target_parent_asin": target,
        "target_title": str(products.get(target, {}).get("title", ""))[:200],
        "target_categories": products.get(target, {}).get("categories", []),
        "target_price": products.get(target, {}).get("price"),
        "target_rating": products.get(target, {}).get("average_rating"),
        "target_rating_number": products.get(target, {}).get("rating_number"),
        "hit": hit_turn is not None,
        "first_hit_turn": hit_turn,
        "best_rank": best_rank,
        "reciprocal_rank": 0.0 if best_rank is None else 1.0 / best_rank,
        "total_turns": len(turns),
        "turns": turns,
        "intent_card": effective_intent_card,
        "behavior": effective_behavior,
        "user_profile": {
            "purchase_frequency": sample["user_profile"].get("purchase_frequency", ""),
            "rating_style": sample["user_profile"].get("rating_style", ""),
            "preference_tags": sample["user_profile"].get("preference_tags", []),
        },
    }


def _compute_state_diff(before: dict, after: dict) -> dict:
    """Compute what changed between two state snapshots."""
    diff = {"added": {}, "removed": {}, "retained": {}}

    # Category change
    if before.get("category") != after.get("category"):
        if after.get("category"):
            diff["added"]["category"] = after["category"]

    # Compare constraint dicts
    for field in ("hard_constraints", "soft_preferences", "negative_constraints"):
        b = before.get(field, {})
        a = after.get(field, {})
        all_keys = set(list(b.keys()) + list(a.keys()))
        for key in sorted(all_keys):
            bvals = set(b.get(key, []))
            avals = set(a.get(key, []))
            added = avals - bvals
            removed = bvals - avals
            retained = avals & bvals
            if added:
                diff["added"].setdefault(field, {})[key] = sorted(added)
            if removed:
                diff["removed"].setdefault(field, {})[key] = sorted(removed)
            if retained:
                diff["retained"].setdefault(field, {})[key] = sorted(retained)

    return diff


# ---------------------------------------------------------------------------
# version comparison builder
# ---------------------------------------------------------------------------

def build_version_comparison(reports_dir: Path, official_root: Path) -> list[dict]:
    """Build a source-labelled version comparison from authoritative artifacts."""
    versions = [
        (
            "Official Weak BM25 Baseline",
            official_root / "docs" / "baseline_results.json",
            "docs/baseline_results.json",
            "technical_score",
        ),
        (
            "Rules V1.1",
            reports_dir / "official_public_rules_v1_1.json",
            "official_public_rules_v1_1.json",
            "recommended_technical_score",
        ),
        (
            "Rules V1.2",
            reports_dir / "official_public_rules_v1_2.json",
            "official_public_rules_v1_2.json",
            "recommended_technical_score",
        ),
        (
            "Rules V1.3 (submitted)",
            reports_dir / "official_public_rules_v1_3.json",
            "official_public_rules_v1_3.json",
            "recommended_technical_score",
        ),
    ]
    comparison = []
    for label, path, source_label, score_key in versions:
        if not path.is_file():
            _fail(f"Version-comparison source missing: {path}")
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        score = data.get(score_key)
        if score is None:
            _fail(f"Version-comparison score missing in {path}: {score_key}")
        comparison.append({
            "version": label,
            "file": source_label,
            "hit_rate_at_10": data.get("hit_rate_at_10"),
            "mrr": data.get("mrr"),
            "mttc": data.get("mttc"),
            "efficiency": data.get("efficiency"),
            "technical_score": score,
            "scenario_metrics": data.get("scenario_metrics", {}),
        })
    return comparison


def load_approved_canonical_cases(traces: list[dict]) -> tuple[list[dict], dict]:
    """Load and validate the source-controlled owner-approved case selection."""
    approval_path = _REPO_ROOT / "demo" / "canonical_cases.json"
    if not approval_path.is_file():
        _fail(f"Owner-approved canonical case file missing: {approval_path}")
    with approval_path.open(encoding="utf-8") as f:
        approval = json.load(f)
    if approval.get("owner_approved") is not True:
        _fail("Canonical cases are not owner-approved")

    canonical_cases = approval.get("canonical_cases")
    if not isinstance(canonical_cases, list) or not canonical_cases:
        _fail("No canonical cases configured")

    traces_by_id = {trace["sample_id"]: trace for trace in traces}
    seen_roles: set[tuple[str, str]] = set()
    for case in canonical_cases:
        sample_id = case.get("sample_id")
        scenario_type = case.get("scenario_type")
        role = case.get("role")
        if sample_id not in traces_by_id:
            _fail(f"Canonical case is not an official public trace: {sample_id}")
        if traces_by_id[sample_id]["scenario_type"] != scenario_type:
            _fail(f"Canonical case scenario mismatch: {sample_id}")
        if role not in {"primary_video", "primary_website", "secondary"}:
            _fail(f"Invalid canonical case role for {sample_id}: {role}")
        key = (scenario_type, role)
        if role != "secondary" and key in seen_roles:
            _fail(f"Duplicate primary canonical role: {scenario_type}/{role}")
        seen_roles.add(key)
    return canonical_cases, approval


# ---------------------------------------------------------------------------
# catalog samples
# ---------------------------------------------------------------------------

def _safe_price(val) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def select_catalog_samples(catalog_path: Path, n: int = 3) -> list[dict]:
    """Select a few diverse catalog products as examples."""
    # Pick products with interesting metadata across price ranges
    products = []
    with catalog_path.open(encoding="utf-8") as f:
        for line in f:
            p = json.loads(line)
            price = _safe_price(p.get("price"))
            if price is not None and p.get("average_rating") and p.get("title"):
                p["_price_f"] = price
                products.append(p)

    # Deterministic selection: pick from different price ranges
    rng = random.Random(42)
    low = [p for p in products if p["_price_f"] < 30]
    mid = [p for p in products if 30 <= p["_price_f"] < 80]
    high = [p for p in products if p["_price_f"] >= 80]

    samples = []
    for bucket in [low, mid, high]:
        if bucket:
            p = rng.choice(bucket)
            samples.append({
                "parent_asin": p["parent_asin"],
                "title": str(p.get("title", ""))[:150],
                "categories": p.get("categories", []),
                "price": p.get("price"),
                "average_rating": p.get("average_rating"),
                "rating_number": p.get("rating_number"),
                "store": p.get("store"),
                "features": [str(f)[:100] for f in (p.get("features") or [])[:3]],
                "details": {k: str(v)[:80] for k, v in list((p.get("details") or {}).items())[:3]},
            })
    return samples[:n]


# ---------------------------------------------------------------------------
# prompt evolution experiment evidence
# ---------------------------------------------------------------------------

def build_prompt_evolution_evidence() -> dict:
    """Build fail-closed Scheme B evidence from the independently checked snapshot."""
    verified_path = _REPO_ROOT / "reports" / "scheme_b_prompt_evolution_verified.json"
    v001_path = _REPO_ROOT / "prompts" / "system_prompt_v001.md"
    v002_path = _REPO_ROOT / "prompts" / "system_prompt_v002.md"
    required = [verified_path, v001_path, v002_path]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        _fail("Scheme B prompt evidence source missing: " + ", ".join(missing))

    report = json.loads(verified_path.read_text(encoding="utf-8"))
    if report.get("experiment_id") != "scheme_b_v002":
        _fail("Unexpected prompt experiment id")
    if report.get("source_commit") != "59fce1276372550be9881c68f0680f76750a7e20":
        _fail("Scheme B source commit is not frozen")

    prompt_paths = {"v001": v001_path, "v002": v002_path}
    for version, path in prompt_paths.items():
        expected = report["prompts"][version]["file_sha256"]
        if sha256_file(path) != expected:
            _fail(f"{version} prompt hash drift")
    canonical_v002 = hashlib.sha256(
        v002_path.read_text(encoding="utf-8").strip().encode("utf-8")
    ).hexdigest()
    if canonical_v002 != report["prompts"]["v002"]["canonical_sha256"]:
        _fail("v002 canonical prompt hash drift")

    weights = {
        "domain_accuracy": 0.25,
        "dialogue_act_accuracy": 0.25,
        "slot_f1": 0.25,
        "rollout_state_exact": 0.15,
        "json_compliance": 0.10,
    }
    before = report["metrics"]["v001"]
    candidate = report["metrics"]["v002"]
    for version, metrics in (("v001", before), ("v002", candidate)):
        recomputed = sum(metrics[name] * weight for name, weight in weights.items())
        if abs(recomputed - metrics["composite"]) > 1e-12:
            _fail(f"{version} composite does not recompute")
    for metric in report["protected_metrics"]:
        if candidate[metric] + 1e-12 < before[metric]:
            _fail(f"Scheme B protected metric regressed: {metric}")
    if candidate["json_compliance"] != 1.0:
        _fail("Scheme B JSON compliance is not saturated")
    if report["gates"] != {
        "dev": "accepted",
        "validation": "accepted_opaque",
        "heldout": "not_run",
    }:
        _fail("Scheme B gate boundary drift")

    metric_order = [
        "composite",
        "domain_accuracy",
        "dialogue_act_accuracy",
        "clarity_accuracy",
        "slot_f1",
        "rollout_state_exact",
        "no_mutation_preservation",
        "selection_accuracy",
        "json_compliance",
    ]
    deltas = {name: candidate[name] - before[name] for name in metric_order}
    return {
        "evidence_scope": "scheme_b_synthetic_dev_with_opaque_validation",
        "status": report["status"],
        "experiment_id": report["experiment_id"],
        "source_branch": report["source_branch"],
        "source_commit": report["source_commit"],
        "model": report["model"],
        "roles": report["roles"],
        "official_score_path": False,
        "split": report["split"],
        "score_formula": report["score_formula"],
        "protected_metrics": report["protected_metrics"],
        "metric_order": metric_order,
        "metrics": {"v001": before, "v002": candidate, "delta": deltas},
        "relative_composite_gain": deltas["composite"] / before["composite"],
        "confusions": report["confusions"],
        "pipeline": [
            "Scrub dev evidence",
            "Codex writes candidate",
            "Qwen target evaluates",
            "Strict dev gate",
            "Opaque validation gate",
            "Promote v002",
        ],
        "guardrails": [
            "No validation text or metric feedback reaches the optimizer",
            "Reject any protected-metric regression",
            "Reject copied dev sentences, IDs, missing markers, or >15% length drift",
            "Held-out labels remain unbundled and not run",
        ],
        "gates": report["gates"],
        "prompts": report["prompts"],
        "comparison_cases": report["comparison_cases"],
        "claim_boundary": report["claim_boundary"],
        "verification": report["verification"],
        "artifacts": {
            "verified_snapshot": "reports/scheme_b_prompt_evolution_verified.json",
            "v001_prompt": "prompts/system_prompt_v001.md",
            "v002_prompt": "prompts/system_prompt_v002.md",
            "source_branch": "codex/scheme-b-prompt-evolution@59fce12",
        },
        "verified_snapshot_sha256": sha256_file(verified_path),
        "v001_prompt_sha256": sha256_file(v001_path),
        "v002_prompt_sha256": sha256_file(v002_path),
    }


# ---------------------------------------------------------------------------
# validation
# ---------------------------------------------------------------------------

def validate_against_report(traces: list[dict], report: dict, catalog_ids: set[str]) -> None:
    """Fail-closed validation: traces must match the summary report exactly."""
    report_sessions = {s["sample_id"]: s for s in report.get("sessions", [])}

    for trace in traces:
        sid = trace["sample_id"]

        # 1. sample_id must be in public split
        if not sid.startswith("public_"):
            _fail(f"sample_id {sid} is not in public split")

        # 2. target parent_asin must be in catalog
        if trace["target_parent_asin"] not in catalog_ids:
            _fail(f"target {trace['target_parent_asin']} not in frozen catalog")

        # 3. Check against summary report
        if sid not in report_sessions:
            _fail(f"sample_id {sid} not found in reference report")

        ref = report_sessions[sid]
        if trace["hit"] != ref["hit"]:
            _fail(f"{sid}: hit mismatch (trace={trace['hit']}, report={ref['hit']})")
        if trace["first_hit_turn"] != ref["first_hit_turn"]:
            _fail(f"{sid}: first_hit_turn mismatch (trace={trace['first_hit_turn']}, report={ref['first_hit_turn']})")
        if trace["best_rank"] != ref["best_rank"]:
            _fail(f"{sid}: best_rank mismatch (trace={trace['best_rank']}, report={ref['best_rank']})")

        # 4. Validate all recommendations in all turns
        for t in trace["turns"]:
            seen = set()
            for rec in t["top10"]:
                asin = rec["parent_asin"]
                if asin not in catalog_ids:
                    _fail(f"{sid} turn {t['turn']}: recommendation {asin} not in catalog")
                if asin in seen:
                    _fail(f"{sid} turn {t['turn']}: duplicate recommendation {asin}")
                seen.add(asin)

    # 5. Validate overall metrics match
    trace_hits = sum(1 for t in traces if t["hit"])
    report_hits = sum(1 for s in report.get("sessions", []) if s["hit"])
    if trace_hits != report_hits:
        _fail(f"total hits mismatch (trace={trace_hits}, report={report_hits})")

    n = len(traces)
    trace_hr = trace_hits / n if n else 0
    report_hr = report.get("hit_rate_at_10", 0)
    if abs(trace_hr - report_hr) > 0.001:
        _fail(f"hit_rate mismatch (trace={trace_hr}, report={report_hr})")

    trace_mrr = sum(t["reciprocal_rank"] for t in traces) / n if n else 0
    report_mrr = report.get("mrr", 0)
    if abs(trace_mrr - report_mrr) > 0.001:
        _fail(f"MRR mismatch (trace={trace_mrr:.6f}, report={report_mrr:.6f})")

    trace_mttc = sum(
        t["first_hit_turn"] if t["first_hit_turn"] is not None else 11
        for t in traces
    ) / n if n else 0
    report_mttc = report.get("mttc", 0)
    if abs(trace_mttc - report_mttc) > 0.001:
        _fail(f"MTTC mismatch (trace={trace_mttc:.6f}, report={report_mttc:.6f})")

    print(f"  ✓ All {n} traces validated against reference report")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Build frozen demo evidence JSON")
    parser.add_argument("--official-root", type=Path, default=None)
    parser.add_argument("--report", type=Path, default=None,
                        help="Reference report for validation (default: reports/official_public_rules_v1_3.json)")
    args = parser.parse_args()

    # Resolve paths
    official_root = args.official_root
    if official_root is None:
        env = os.environ.get("TECHJAM_OFFICIAL_ROOT")
        if env:
            official_root = Path(env)
        else:
            sibling = _REPO_ROOT.parent / "techjam-conversational-search"
            if (sibling / "evaluator" / "local_evaluator.py").is_file():
                official_root = sibling
            else:
                _fail("Cannot find official root. Use --official-root or TECHJAM_OFFICIAL_ROOT.")
    official_root = official_root.resolve()

    catalog_path = official_root / "data" / "catalog.jsonl"
    dataset_path = official_root / "data" / "public_set.jsonl"
    evaluator_path = official_root / "evaluator" / "local_evaluator.py"

    if not catalog_path.is_file():
        _fail(f"Catalog not found: {catalog_path}")
    if not dataset_path.is_file():
        _fail(f"Dataset not found: {dataset_path}")
    if not evaluator_path.is_file():
        _fail(f"Evaluator not found: {evaluator_path}")

    report_path = args.report or (_REPO_ROOT / "reports" / "official_public_rules_v1_3.json")
    if not report_path.is_file():
        _fail(f"Reference report not found: {report_path}")

    print("Building demo evidence...")
    print(f"  Official root: {official_root}")
    print(f"  Catalog: {catalog_path}")
    print(f"  Dataset: {dataset_path}")
    print(f"  Reference report: {report_path}")

    # Import evaluator functions
    sys.path.insert(0, str(official_root))
    from evaluator.local_evaluator import (
        ALLOWED_ATTRIBUTES,
        MAX_TURNS,
        TOP_K,
        catalog_index,
        classify_constraint,
        coarse_category,
        customer_reply,
        initial_message,
        load_jsonl,
        materialize_hidden_fields,
        normalize_recommendations,
    )

    # Import agent
    from shopping_copilot.official_agent import Agent

    # Load data
    print("  Loading catalog and dataset...")
    samples = load_jsonl(dataset_path)
    catalog_ids, categories, products = catalog_index(catalog_path)
    print(f"  Catalog: {len(catalog_ids)} products")
    print(f"  Public sessions: {len(samples)}")

    # Load reference report
    with report_path.open(encoding="utf-8") as f:
        reference_report = json.load(f)

    # Initialize agent (rules-only, same as official scoring)
    print("  Initializing rules-only agent...")
    agent_obj = Agent(str(catalog_path), intent_backend="rules")
    # We need the inner agent for state access
    inner_agent = agent_obj._agent

    # Replay all sessions with turn-level traces
    print("  Replaying 200 public sessions with trace capture...")
    all_traces = []
    for i, sample in enumerate(samples):
        trace = replay_session_with_traces(
            inner_agent, sample, catalog_ids, categories, products,
            materialize_hidden_fields=materialize_hidden_fields,
            initial_message=initial_message,
            customer_reply=customer_reply,
            coarse_category=coarse_category,
            normalize_recommendations=normalize_recommendations,
            classify_constraint=classify_constraint,
            MAX_TURNS=MAX_TURNS,
            TOP_K=TOP_K,
            ALLOWED_ATTRIBUTES=ALLOWED_ATTRIBUTES,
        )
        all_traces.append(trace)
        if (i + 1) % 50 == 0:
            print(f"    {i + 1}/200 sessions replayed")

    agent_obj.close()
    print(f"  All {len(all_traces)} sessions replayed")

    # Validate against reference report
    print("  Validating traces against reference report...")
    validate_against_report(all_traces, reference_report, catalog_ids)

    # Compute hashes
    catalog_hash = sha256_file(catalog_path)
    report_hash = sha256_file(report_path)
    agent_commit = git_commit(_REPO_ROOT)
    evaluator_commit = git_commit(official_root)

    # Build output
    output_dir = _REPO_ROOT / "demo" / "evidence"
    output_dir.mkdir(parents=True, exist_ok=True)
    scenarios_dir = output_dir / "scenarios"
    scenarios_dir.mkdir(exist_ok=True)

    # 1. Write individual scenario traces
    print("  Writing scenario traces...")
    for trace in all_traces:
        path = scenarios_dir / f"{trace['sample_id']}.json"
        path.write_text(json.dumps(trace, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 2. Build metrics.json
    metrics = {
        "evidence_scope": "official_public_200",
        "evaluator": "unmodified official local_evaluator.py",
        "intent_backend": "rules",
        "sample_count": reference_report["sample_count"],
        "hit_rate_at_10": reference_report["hit_rate_at_10"],
        "mrr": reference_report["mrr"],
        "mttc": reference_report["mttc"],
        "efficiency": reference_report["efficiency"],
        "technical_score": reference_report["recommended_technical_score"],
        "reported_token_usage": reference_report["reported_token_usage"],
        "scenario_metrics": reference_report["scenario_metrics"],
        "first_hit_turn_distribution": _first_hit_distribution(all_traces),
        "best_rank_distribution": _rank_distribution(all_traces),
    }
    (output_dir / "metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 3. Build dataset.json
    dataset_info = {
        "source": "Amazon Reviews 2023",
        "category": "Clothing_Shoes_and_Jewelry",
        "catalog_size": len(catalog_ids),
        "public_sessions": len(samples),
        "private_sessions": 800,
        "max_turns": MAX_TURNS,
        "catalog_read_only": True,
        "scored_identifier": "parent_asin",
        "scenario_mix": {
            "buying": {"count": sum(1 for s in samples if s["scenario_type"] == "buying"),
                       "percentage": 40, "description": "Hard constraint disclosed early"},
            "browsing": {"count": sum(1 for s in samples if s["scenario_type"] == "browsing"),
                         "percentage": 40, "description": "Customer begins vague"},
            "intent_override": {"count": sum(1 for s in samples if s["scenario_type"] == "intent_override"),
                                "percentage": 15, "description": "Earlier preference replaced on turn 3-4"},
            "boundary": {"count": sum(1 for s in samples if s["scenario_type"] == "boundary"),
                         "percentage": 5, "description": "User has no preference for requested attribute"},
        },
        "visible_fields": ["parent_asin", "title", "features", "description", "price",
                           "categories", "details", "average_rating", "rating_number", "store"],
        "scoring_formula": "TechnicalScore = 0.50 × HitRate@10 + 0.30 × MRR + 0.20 × Efficiency",
        "efficiency_formula": "Efficiency = clip((11 - MTTC) / 10, 0, 1)",
    }
    (output_dir / "dataset.json").write_text(
        json.dumps(dataset_info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 4. Build version_comparison.json
    version_cmp = build_version_comparison(_REPO_ROOT / "reports", official_root)
    (output_dir / "version_comparison.json").write_text(
        json.dumps(version_cmp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 5. Build catalog_samples.json
    catalog_samples = select_catalog_samples(catalog_path)
    (output_dir / "catalog_samples.json").write_text(
        json.dumps(catalog_samples, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 6. Build prompt_evolution.json from real local-Qwen experiment artifacts
    prompt_evolution = build_prompt_evolution_evidence()
    (output_dir / "prompt_evolution.json").write_text(
        json.dumps(prompt_evolution, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 7. Build manifest.json (last, references everything)
    canonical_candidates = _nominate_canonical_cases(all_traces)
    canonical_cases, canonical_approval = load_approved_canonical_cases(all_traces)
    manifest = {
        "evidence_scope": "official_public_200",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "catalog_sha256": catalog_hash,
        "evaluator_git_commit": evaluator_commit,
        "agent_git_commit": agent_commit,
        "report_sha256": report_hash,
        "report_file": str(report_path.name),
        "metrics": {
            "hit_rate_at_10": reference_report["hit_rate_at_10"],
            "mrr": reference_report["mrr"],
            "mttc": reference_report["mttc"],
            "efficiency": reference_report["efficiency"],
            "technical_score": reference_report["recommended_technical_score"],
        },
        "sample_count": len(all_traces),
        "scenario_counts": {
            "buying": sum(1 for t in all_traces if t["scenario_type"] == "buying"),
            "browsing": sum(1 for t in all_traces if t["scenario_type"] == "browsing"),
            "intent_override": sum(1 for t in all_traces if t["scenario_type"] == "intent_override"),
            "boundary": sum(1 for t in all_traces if t["scenario_type"] == "boundary"),
        },
        "canonical_case_candidates": canonical_candidates,
        "canonical_cases_frozen": True,
        "canonical_cases": canonical_cases,
        "canonical_approval": {
            "approved_at": canonical_approval.get("approved_at"),
            "approval_note": canonical_approval.get("approval_note", ""),
            "source": "demo/canonical_cases.json",
        },
        "evaluator_command": "python tools/evaluate_official.py --official-root ../techjam-conversational-search --intent-backend rules",
        "reproduce_command": "python scripts/build_demo_evidence.py --official-root ../techjam-conversational-search",
        "artifacts": [
            "demo/evidence/manifest.json",
            "demo/evidence/metrics.json",
            "demo/evidence/dataset.json",
            "demo/evidence/version_comparison.json",
            "demo/evidence/catalog_samples.json",
            "demo/evidence/prompt_evolution.json",
            "demo/evidence/scenarios/*.json",
        ],
        "claim_boundary": {
            "public_200": "verified by official public-set evaluator",
            "private_800": "unknown — performance not measured",
            "score_label": "official public-set evaluator result",
            "not_labels": [
                "hidden-set score",
                "final score",
                "competition-ready score",
                "private-set evidence",
            ],
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("\n=== Evidence build complete ===")
    print(f"  Output: {output_dir}")
    print(f"  Manifest: {output_dir / 'manifest.json'}")
    print(f"  Catalog SHA256: {catalog_hash[:16]}...")
    print(f"  Report SHA256: {report_hash[:16]}...")
    print(f"  Agent commit: {agent_commit[:12]}...")
    print(f"  Traces: {len(all_traces)} sessions")
    print(f"  Canonical candidates: {len(canonical_candidates)}")
    print("\n=== Canonical case candidates for owner review ===")
    for c in canonical_candidates:
        print(f"  {c['sample_id']} ({c['scenario_type']}): "
              f"hit_turn={c['first_hit_turn']}, rank={c['best_rank']}, "
              f"turns={c['total_turns']}, mechanism={c['demonstrates']}")


def _first_hit_distribution(traces: list[dict]) -> dict[str, int]:
    dist: dict[str, int] = {}
    for t in traces:
        key = str(t["first_hit_turn"]) if t["first_hit_turn"] is not None else "miss"
        dist[key] = dist.get(key, 0) + 1
    return dict(sorted(dist.items(), key=lambda x: (x[0] == "miss", x[0])))


def _rank_distribution(traces: list[dict]) -> dict[str, int]:
    dist: dict[str, int] = {}
    for t in traces:
        key = str(t["best_rank"]) if t["best_rank"] is not None else "miss"
        dist[key] = dist.get(key, 0) + 1
    return dict(sorted(dist.items(), key=lambda x: (x[0] == "miss", x[0])))


def _nominate_canonical_cases(traces: list[dict]) -> list[dict]:
    """Nominate canonical cases for each scenario type.

    Selection criteria:
    - Buying: one with first_hit_turn=1 (early lock), one with multi-turn improvement
    - Browsing: one showing clarification-driven improvement
    - Intent Override: two showing clear erase-and-rewrite behavior
    - Boundary: one showing "no preference" handling
    """
    candidates = []
    by_scenario: dict[str, list[dict]] = defaultdict(list)
    for t in traces:
        by_scenario[t["scenario_type"]].append(t)

    # Buying: best first-turn hit + a multi-turn case
    buying = sorted(by_scenario.get("buying", []), key=lambda x: (x["best_rank"] or 99, x["first_hit_turn"] or 99))
    buying_first_turn = [t for t in buying if t["first_hit_turn"] == 1 and t["best_rank"] and t["best_rank"] <= 3]
    buying_multi_turn = [t for t in buying if t["first_hit_turn"] and t["first_hit_turn"] > 1 and t["hit"]]
    if buying_first_turn:
        t = buying_first_turn[0]
        candidates.append(_candidate_entry(t, "Early hard-constraint lock: target in Top-3 on turn 1"))
    if buying_multi_turn:
        t = buying_multi_turn[0]
        candidates.append(_candidate_entry(t, "Multi-turn constraint refinement improves rank"))

    # Browsing: sessions with clarification improvement
    browsing = [t for t in by_scenario.get("browsing", []) if t["hit"] and t["first_hit_turn"] and t["first_hit_turn"] >= 2]
    browsing = sorted(browsing, key=lambda x: (x["best_rank"] or 99, x["first_hit_turn"] or 99))
    if browsing:
        # Pick one that shows clear clarification value (multi-turn then good rank)
        good = [t for t in browsing if t["first_hit_turn"] and t["first_hit_turn"] <= 4 and t["best_rank"] and t["best_rank"] <= 3]
        t = good[0] if good else browsing[0]
        candidates.append(_candidate_entry(t, "Candidate-driven clarification narrows vague browsing intent"))
    # Also add a first-turn browsing hit to show breadth
    browsing_quick = [t for t in by_scenario.get("browsing", []) if t["first_hit_turn"] == 1 and t["best_rank"] and t["best_rank"] <= 3]
    if browsing_quick:
        candidates.append(_candidate_entry(browsing_quick[0], "Browsing hit on turn 1 despite vague intent"))

    # Intent Override: two cases showing erase-and-rewrite
    override = [t for t in by_scenario.get("intent_override", []) if t["hit"]]
    override = sorted(override, key=lambda x: (x["best_rank"] or 99, x["first_hit_turn"] or 99))
    for t in override[:2]:
        # Check that there's a visible state diff (erase)
        has_erase = any(
            turn.get("state_diff", {}).get("removed")
            for turn in t["turns"]
        )
        mechanism = "Erase-and-rewrite: old preference removed, new preference set"
        if has_erase:
            mechanism += " (visible slot deletion in trace)"
        candidates.append(_candidate_entry(t, mechanism))

    # Boundary: "no preference" handling
    boundary = [t for t in by_scenario.get("boundary", []) if t["hit"]]
    boundary = sorted(boundary, key=lambda x: (x["best_rank"] or 99, x["first_hit_turn"] or 99))
    if boundary:
        t = boundary[0]
        candidates.append(_candidate_entry(t, "Handles 'no preference' without losing valid constraints"))

    return candidates


def _candidate_entry(trace: dict, demonstrates: str) -> dict:
    # Check for potential misleading anomalies
    anomalies = []
    if trace["best_rank"] and trace["best_rank"] >= 8:
        anomalies.append("target rank is low (≥8), may look weak")
    if trace["total_turns"] >= 8:
        anomalies.append("session is long (≥8 turns), may seem inefficient")
    if not trace["hit"]:
        anomalies.append("session is a miss")

    return {
        "sample_id": trace["sample_id"],
        "scenario_type": trace["scenario_type"],
        "total_turns": trace["total_turns"],
        "target_parent_asin": trace["target_parent_asin"],
        "target_title": trace["target_title"][:100],
        "first_hit_turn": trace["first_hit_turn"],
        "best_rank": trace["best_rank"],
        "demonstrates": demonstrates,
        "anomalies": anomalies if anomalies else None,
    }


if __name__ == "__main__":
    main()
