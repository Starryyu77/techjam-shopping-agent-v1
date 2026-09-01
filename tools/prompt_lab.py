from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shopping_copilot.shopping_agent import (
    HybridIntentParser,
    IntentResult,
    LocalModelClient,
    ModelUnavailable,
    PromptIntentParser,
    RuleIntentParser,
    ShoppingState,
    load_current_prompt,
)


ROOT = REPO_ROOT
DEFAULT_DATASET = ROOT.parent / "真实购物对话数据集"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def load_sessions(dataset: Path, split: str) -> list[dict[str, Any]]:
    if split != "test":
        return read_jsonl(dataset / "data" / f"{split}.jsonl")
    inputs = {item["session_id"]: item for item in read_jsonl(dataset / "data" / "test_inputs.jsonl")}
    labels = read_jsonl(dataset / "data" / "heldout" / "test_labels.jsonl")
    sessions: list[dict[str, Any]] = []
    for label in labels:
        session = dict(inputs[label["session_id"]])
        by_turn = {item["turn"]: item["annotation"] for item in label["turn_annotations"]}
        session["turns"] = [
            {**turn, "annotation": by_turn[turn["turn"]]} for turn in session["turns"]
        ]
        sessions.append(session)
    return sessions


def make_parser(args: argparse.Namespace, prompt: str | None = None) -> Any:
    rules = RuleIntentParser()
    if args.backend == "rules":
        return rules
    if not args.endpoint:
        raise SystemExit("model 或 hybrid 后端必须提供 --endpoint")
    model = PromptIntentParser(
        LocalModelClient(args.endpoint, args.model, args.timeout),
        prompt or load_current_prompt(),
    )
    return model if args.backend == "model" else HybridIntentParser(rules=rules, model=model)


def _expected_slots(annotation: dict[str, Any]) -> set[tuple[str, str, str]]:
    delta = annotation["state_delta"]
    slots: set[tuple[str, str, str]] = set()
    for item in delta["set"]:
        slots.add((item["attribute"], str(item["value"]).casefold(), item["bucket"]))
    for item in delta["remove"]:
        if isinstance(item, str):
            slots.add((item, "", "remove"))
        else:
            slots.add((item["attribute"], str(item.get("value", "")).casefold(), "remove"))
    for item in delta["mark_no_preference"]:
        attribute = item if isinstance(item, str) else item["attribute"]
        slots.add((attribute, "", "no_preference"))
    return slots


def _predicted_slots(result: IntentResult) -> set[tuple[str, str, str]]:
    slots: set[tuple[str, str, str]] = set()
    for item in result.constraints:
        bucket = item.operation
        if item.operation == "set":
            bucket = item.hardness
        elif item.operation == "negative":
            bucket = "negative"
        slots.add((item.attribute, item.value.casefold(), bucket))
    return slots


def _state_view(state: ShoppingState) -> dict[str, Any]:
    def normalized(mapping: dict[str, list[str]]) -> dict[str, list[str]]:
        return {
            key: sorted(value.casefold() for value in values)
            for key, values in sorted(mapping.items())
        }

    return {
        "category": state.category.casefold() if state.category else None,
        "hard_constraints": normalized(state.hard_constraints),
        "soft_preferences": normalized(state.soft_preferences),
        "negative_constraints": normalized(state.negative_constraints),
        "no_preference": sorted(state.no_preference),
        "status": state.status,
    }


def _expected_state_view(value: dict[str, Any]) -> dict[str, Any]:
    state = ShoppingState.from_gold_state(value)
    return _state_view(state)


def evaluate(parser: Any, sessions: list[dict[str, Any]]) -> dict[str, Any]:
    totals = {
        "turns": 0,
        "valid": 0,
        "domain": 0,
        "act": 0,
        "clarity": 0,
        "slot_tp": 0,
        "slot_fp": 0,
        "slot_fn": 0,
        "state": 0,
        "no_mutation_turns": 0,
        "no_mutation_preserved": 0,
    }
    badcases: list[dict[str, Any]] = []
    for session in sessions:
        state = ShoppingState(language=session.get("language", "zh-CN"))
        for turn in session["turns"]:
            totals["turns"] += 1
            annotation = turn["annotation"]
            before = _state_view(state)
            error = None
            result = None
            try:
                result = parser.parse(turn["user_message"], state)
                totals["valid"] += 1
            except (ModelUnavailable, ValueError, json.JSONDecodeError) as exc:
                error = str(exc)
            if result is not None:
                totals["domain"] += result.domain_intent == annotation["domain_intent"]
                totals["act"] += result.dialogue_act == annotation["dialogue_act"]
                totals["clarity"] += result.clarity_level == annotation["clarity_level"]
                expected_slots = _expected_slots(annotation)
                predicted_slots = _predicted_slots(result)
                totals["slot_tp"] += len(expected_slots & predicted_slots)
                totals["slot_fp"] += len(predicted_slots - expected_slots)
                totals["slot_fn"] += len(expected_slots - predicted_slots)
                if result.confidence >= 0.75 and result.domain_intent not in {"IRRELEVANT", "BENEFIT"}:
                    state.apply(result)
                    if result.dialogue_act == "SELECT":
                        state.status = "selected"
                if not annotation["should_mutate_state"]:
                    totals["no_mutation_turns"] += 1
                    totals["no_mutation_preserved"] += before == _state_view(state)
                totals["state"] += _state_view(state) == _expected_state_view(annotation["expected_state"])
            predicted = result.to_dict() if result else None
            correct = result is not None and (
                result.domain_intent == annotation["domain_intent"]
                and result.dialogue_act == annotation["dialogue_act"]
                and _expected_slots(annotation) == _predicted_slots(result)
            )
            if not correct:
                badcases.append(
                    {
                        "session_id": session["session_id"],
                        "turn": turn["turn"],
                        "user_message": turn["user_message"],
                        "state_before": before,
                        "expected": {
                            "domain_intent": annotation["domain_intent"],
                            "dialogue_act": annotation["dialogue_act"],
                            "clarity_level": annotation["clarity_level"],
                            "state_delta": annotation["state_delta"],
                        },
                        "predicted": predicted,
                        "error": error,
                    }
                )
    n = totals["turns"] or 1
    precision_den = totals["slot_tp"] + totals["slot_fp"]
    recall_den = totals["slot_tp"] + totals["slot_fn"]
    precision = totals["slot_tp"] / precision_den if precision_den else 1.0
    recall = totals["slot_tp"] / recall_den if recall_den else 1.0
    slot_f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    metrics = {
        "turns": totals["turns"],
        "json_compliance": totals["valid"] / n,
        "domain_accuracy": totals["domain"] / n,
        "dialogue_act_accuracy": totals["act"] / n,
        "clarity_accuracy": totals["clarity"] / n,
        "slot_precision": precision,
        "slot_recall": recall,
        "slot_f1": slot_f1,
        "rollout_state_exact": totals["state"] / n,
        "no_mutation_preservation": (
            totals["no_mutation_preserved"] / totals["no_mutation_turns"]
            if totals["no_mutation_turns"]
            else 1.0
        ),
    }
    metrics["composite"] = (
        0.25 * metrics["domain_accuracy"]
        + 0.25 * metrics["dialogue_act_accuracy"]
        + 0.25 * metrics["slot_f1"]
        + 0.15 * metrics["rollout_state_exact"]
        + 0.10 * metrics["json_compliance"]
    )
    return {"metrics": metrics, "badcases": badcases}


def save_report(report: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def evaluate_command(args: argparse.Namespace) -> int:
    report = evaluate(make_parser(args), load_sessions(args.dataset, args.split))
    report["split"] = args.split
    report["backend"] = args.backend
    output = args.output or ROOT / "reports" / f"{args.backend}_{args.split}.json"
    save_report(report, output)
    print(json.dumps(report["metrics"], ensure_ascii=False, indent=2))
    print(f"报告：{output}")
    return 0


def _next_prompt_name() -> str:
    versions = []
    for path in (ROOT / "prompts").glob("system_prompt_v*.md"):
        match = re.fullmatch(r"system_prompt_v(\d+)\.md", path.name)
        if match:
            versions.append(int(match.group(1)))
    return f"system_prompt_v{max(versions, default=0) + 1:03d}.md"


def _clean_prompt(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:markdown|text)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    if len(cleaned) < 300:
        raise ModelUnavailable("optimizer returned an implausibly short prompt")
    return cleaned


def optimize_command(args: argparse.Namespace) -> int:
    if not args.endpoint:
        raise SystemExit("optimize 必须提供 --endpoint")
    train = load_sessions(args.dataset, "dev")
    validation = load_sessions(args.dataset, "validation")
    optimizer = LocalModelClient(args.endpoint, args.model, args.timeout)
    current_prompt = load_current_prompt()
    current_validation = evaluate(make_parser(args, current_prompt), validation)
    history: list[dict[str, Any]] = []
    for round_number in range(1, args.rounds + 1):
        train_report = evaluate(make_parser(args, current_prompt), train)
        evidence = {
            "train_metrics": train_report["metrics"],
            "train_badcases": train_report["badcases"][: args.max_badcases],
        }
        request = (
            "Revise the shopping intent parser system prompt below. Return the full replacement "
            "prompt only. Fix general rules demonstrated by the development-set bad cases; do not "
            "memorize wording or IDs. Keep the exact JSON fields and enums. Do not add product search.\n\n"
            f"CURRENT PROMPT:\n{current_prompt}\n\nDEVELOPMENT EVIDENCE:\n"
            + json.dumps(evidence, ensure_ascii=False)
        )
        candidate_text, usage = optimizer.chat(
            [{"role": "user", "content": request + "\n/no_think"}],
            max_tokens=2600,
        )
        candidate_prompt = _clean_prompt(candidate_text)
        candidate_validation = evaluate(make_parser(args, candidate_prompt), validation)
        old = current_validation["metrics"]
        new = candidate_validation["metrics"]
        accepted = (
            new["composite"] > old["composite"]
            and new["json_compliance"] >= old["json_compliance"] - 0.01
            and new["no_mutation_preservation"] >= old["no_mutation_preservation"] - 0.01
        )
        record = {
            "round": round_number,
            "accepted": accepted,
            "optimizer_usage": usage,
            "before_validation": old,
            "candidate_validation": new,
        }
        if accepted:
            name = _next_prompt_name()
            path = ROOT / "prompts" / name
            path.write_text(candidate_prompt + "\n", encoding="utf-8")
            (ROOT / "prompts" / "current.txt").write_text(name + "\n", encoding="utf-8")
            record["saved_as"] = name
            current_prompt = candidate_prompt
            current_validation = candidate_validation
        history.append(record)
        print(json.dumps(record, ensure_ascii=False, indent=2))
    output = ROOT / "reports" / f"optimize_{datetime.now():%Y%m%d_%H%M%S}.json"
    save_report({"history": history}, output)
    print(f"迭代记录：{output}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="方案 B：意图识别提示词评测与迭代")
    subparsers = parser.add_subparsers(dest="command", required=True)
    evaluate_parser = subparsers.add_parser("evaluate")
    evaluate_parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    evaluate_parser.add_argument("--split", choices=("dev", "validation", "test"), default="dev")
    evaluate_parser.add_argument("--backend", choices=("rules", "model", "hybrid"), default="rules")
    evaluate_parser.add_argument("--endpoint")
    evaluate_parser.add_argument("--model", default="qwen3-8b")
    evaluate_parser.add_argument("--timeout", type=float, default=30.0)
    evaluate_parser.add_argument("--output", type=Path)
    evaluate_parser.set_defaults(function=evaluate_command)

    optimize_parser = subparsers.add_parser("optimize")
    optimize_parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    optimize_parser.add_argument("--backend", choices=("model", "hybrid"), default="model")
    optimize_parser.add_argument("--endpoint", required=True)
    optimize_parser.add_argument("--model", default="qwen3-8b")
    optimize_parser.add_argument("--timeout", type=float, default=120.0)
    optimize_parser.add_argument("--rounds", type=int, default=1)
    optimize_parser.add_argument("--max-badcases", type=int, default=20)
    optimize_parser.set_defaults(function=optimize_command)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if getattr(args, "rounds", 1) < 1 or getattr(args, "max_badcases", 1) < 1:
        raise SystemExit("--rounds 和 --max-badcases 必须大于 0")
    return args.function(args)


if __name__ == "__main__":
    raise SystemExit(main())
