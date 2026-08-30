"""Tests for the demo evidence artifacts.

Validates:
1. Evidence schema correctness
2. Metric consistency with reference report
3. parent_asin catalog validity
4. No duplicate recommendations
5. Canonical case trace consistency
6. Claim boundary correctness
"""
from __future__ import annotations

import json
import unittest
from pathlib import Path

from demo.server import DemoState

_REPO_ROOT = Path(__file__).resolve().parent.parent
_EVIDENCE_DIR = _REPO_ROOT / "demo" / "evidence"
_REPORTS_DIR = _REPO_ROOT / "reports"


def _load(name: str) -> dict | list:
    path = _EVIDENCE_DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"Evidence artifact not found: {path}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


class ManifestSchemaTests(unittest.TestCase):
    """Validate manifest.json schema and required fields."""

    def setUp(self):
        self.manifest = _load("manifest.json")

    def test_evidence_scope(self):
        self.assertEqual(self.manifest["evidence_scope"], "official_public_200")

    def test_required_fields(self):
        required = [
            "evidence_scope", "generated_at", "catalog_sha256",
            "evaluator_git_commit", "agent_git_commit", "report_sha256",
            "metrics", "sample_count", "scenario_counts",
            "canonical_case_candidates", "evaluator_command",
            "claim_boundary",
        ]
        for field in required:
            self.assertIn(field, self.manifest, f"Missing field: {field}")

    def test_metrics_present(self):
        metrics = self.manifest["metrics"]
        for key in ["hit_rate_at_10", "mrr", "mttc", "efficiency", "technical_score"]:
            self.assertIn(key, metrics)
            self.assertIsInstance(metrics[key], (int, float))

    def test_sample_count(self):
        self.assertEqual(self.manifest["sample_count"], 200)

    def test_scenario_counts_sum(self):
        counts = self.manifest["scenario_counts"]
        total = sum(counts.values())
        self.assertEqual(total, 200)

    def test_scenario_types(self):
        expected = {"buying", "browsing", "intent_override", "boundary"}
        self.assertEqual(set(self.manifest["scenario_counts"].keys()), expected)

    def test_hashes_not_empty(self):
        self.assertTrue(len(self.manifest["catalog_sha256"]) >= 32)
        self.assertTrue(len(self.manifest["report_sha256"]) >= 32)
        self.assertNotEqual(self.manifest["agent_git_commit"], "")

    def test_claim_boundary(self):
        cb = self.manifest["claim_boundary"]
        self.assertIn("public_200", cb)
        self.assertIn("private_800", cb)
        self.assertIn("unknown", cb["private_800"].lower())
        self.assertNotIn("final score", cb["score_label"].lower())
        self.assertNotIn("hidden", cb["score_label"].lower())

    def test_owner_approved_canonical_cases_are_frozen(self):
        self.assertTrue(self.manifest["canonical_cases_frozen"])
        approved_path = _REPO_ROOT / "demo" / "canonical_cases.json"
        self.assertTrue(approved_path.is_file(), "Missing owner-approved canonical case source")
        with approved_path.open(encoding="utf-8") as f:
            approved = json.load(f)
        self.assertTrue(approved["owner_approved"])
        self.assertEqual(self.manifest["canonical_cases"], approved["canonical_cases"])

    def test_generated_evidence_is_shippable(self):
        ignore_text = (_REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertNotIn("demo/evidence/", ignore_text)


class MetricConsistencyTests(unittest.TestCase):
    """Validate metrics match the reference report exactly."""

    def setUp(self):
        self.metrics = _load("metrics.json")
        report_path = _REPORTS_DIR / "official_public_rules_v1_3.json"
        with report_path.open(encoding="utf-8") as f:
            self.report = json.load(f)

    def test_hit_rate_matches(self):
        self.assertAlmostEqual(
            self.metrics["hit_rate_at_10"],
            self.report["hit_rate_at_10"],
            places=6,
        )

    def test_mrr_matches(self):
        self.assertAlmostEqual(
            self.metrics["mrr"],
            self.report["mrr"],
            places=6,
        )

    def test_mttc_matches(self):
        self.assertAlmostEqual(
            self.metrics["mttc"],
            self.report["mttc"],
            places=6,
        )

    def test_efficiency_matches(self):
        self.assertAlmostEqual(
            self.metrics["efficiency"],
            self.report["efficiency"],
            places=6,
        )

    def test_technical_score_matches(self):
        self.assertAlmostEqual(
            self.metrics["technical_score"],
            self.report["recommended_technical_score"],
            places=6,
        )

    def test_scenario_metrics_match(self):
        for scenario, sm in self.metrics["scenario_metrics"].items():
            ref = self.report["scenario_metrics"][scenario]
            self.assertAlmostEqual(sm["hit_rate_at_10"], ref["hit_rate_at_10"], places=6,
                                   msg=f"{scenario} hit_rate mismatch")
            self.assertAlmostEqual(sm["mrr"], ref["mrr"], places=6,
                                   msg=f"{scenario} mrr mismatch")


class CatalogValidityTests(unittest.TestCase):
    """Validate all parent_asins in traces are in the frozen catalog."""

    @classmethod
    def setUpClass(cls):
        catalog_path = _REPO_ROOT.parent / "techjam-conversational-search" / "data" / "catalog.jsonl"
        if not catalog_path.is_file():
            raise unittest.SkipTest(f"Catalog not found: {catalog_path}")
        cls.catalog_ids = set()
        with catalog_path.open(encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                cls.catalog_ids.add(data["parent_asin"])

    def test_catalog_has_50000_products(self):
        self.assertEqual(len(self.catalog_ids), 50000)

    def test_all_targets_in_catalog(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        for path in sorted(scenarios_dir.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                trace = json.load(f)
            self.assertIn(
                trace["target_parent_asin"],
                self.catalog_ids,
                f"{trace['sample_id']}: target not in catalog",
            )

    def test_all_recommendations_in_catalog(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        for path in sorted(scenarios_dir.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                trace = json.load(f)
            for turn in trace["turns"]:
                for rec in turn["top10"]:
                    self.assertIn(
                        rec["parent_asin"],
                        self.catalog_ids,
                        f"{trace['sample_id']} turn {turn['turn']}: rec not in catalog",
                    )

    def test_no_duplicate_recommendations(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        for path in sorted(scenarios_dir.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                trace = json.load(f)
            for turn in trace["turns"]:
                asins = [rec["parent_asin"] for rec in turn["top10"]]
                self.assertEqual(
                    len(asins),
                    len(set(asins)),
                    f"{trace['sample_id']} turn {turn['turn']}: duplicate recs",
                )


class TraceConsistencyTests(unittest.TestCase):
    """Validate traces are consistent with the summary report."""

    def setUp(self):
        report_path = _REPORTS_DIR / "official_public_rules_v1_3.json"
        with report_path.open(encoding="utf-8") as f:
            report = json.load(f)
        self.report_sessions = {s["sample_id"]: s for s in report["sessions"]}

    def test_all_public_sessions_present(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        trace_ids = {p.stem for p in scenarios_dir.glob("*.json")}
        self.assertEqual(len(trace_ids), 200)

    def test_all_sample_ids_public(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        for path in sorted(scenarios_dir.glob("*.json")):
            self.assertTrue(
                path.stem.startswith("public_"),
                f"{path.stem} is not a public session",
            )

    def test_hit_first_hit_turn_match(self):
        scenarios_dir = _EVIDENCE_DIR / "scenarios"
        for path in sorted(scenarios_dir.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                trace = json.load(f)
            ref = self.report_sessions[trace["sample_id"]]
            self.assertEqual(
                trace["hit"], ref["hit"],
                f"{trace['sample_id']}: hit mismatch",
            )
            self.assertEqual(
                trace["first_hit_turn"], ref["first_hit_turn"],
                f"{trace['sample_id']}: first_hit_turn mismatch",
            )
            self.assertEqual(
                trace["best_rank"], ref["best_rank"],
                f"{trace['sample_id']}: best_rank mismatch",
            )


class CanonicalCaseTests(unittest.TestCase):
    """Validate canonical case candidates exist and are from public split."""

    def setUp(self):
        self.manifest = _load("manifest.json")

    def test_candidates_exist(self):
        self.assertGreater(len(self.manifest["canonical_case_candidates"]), 0)

    def test_candidates_are_public(self):
        for c in self.manifest["canonical_case_candidates"]:
            self.assertTrue(
                c["sample_id"].startswith("public_"),
                f"Candidate {c['sample_id']} is not public",
            )

    def test_candidates_have_required_fields(self):
        required = ["sample_id", "scenario_type", "total_turns",
                     "target_parent_asin", "first_hit_turn", "best_rank",
                     "demonstrates"]
        for c in self.manifest["canonical_case_candidates"]:
            for field in required:
                self.assertIn(field, c, f"Candidate {c['sample_id']} missing {field}")

    def test_all_scenario_types_covered(self):
        types = {c["scenario_type"] for c in self.manifest["canonical_case_candidates"]}
        expected = {"buying", "browsing", "intent_override", "boundary"}
        self.assertEqual(types, expected)

    def test_candidate_traces_exist(self):
        for c in self.manifest["canonical_case_candidates"]:
            path = _EVIDENCE_DIR / "scenarios" / f"{c['sample_id']}.json"
            self.assertTrue(path.is_file(), f"Trace not found: {path}")


class DatasetInfoTests(unittest.TestCase):
    """Validate dataset.json correctness."""

    def setUp(self):
        self.dataset = _load("dataset.json")

    def test_source(self):
        self.assertEqual(self.dataset["source"], "Amazon Reviews 2023")

    def test_category(self):
        self.assertEqual(self.dataset["category"], "Clothing_Shoes_and_Jewelry")

    def test_catalog_size(self):
        self.assertEqual(self.dataset["catalog_size"], 50000)

    def test_sessions(self):
        self.assertEqual(self.dataset["public_sessions"], 200)
        self.assertEqual(self.dataset["private_sessions"], 800)

    def test_max_turns(self):
        self.assertEqual(self.dataset["max_turns"], 10)

    def test_catalog_read_only(self):
        self.assertTrue(self.dataset["catalog_read_only"])

    def test_scored_identifier(self):
        self.assertEqual(self.dataset["scored_identifier"], "parent_asin")


class VersionComparisonTests(unittest.TestCase):
    """Validate version_comparison.json structure."""

    def setUp(self):
        self.versions = _load("version_comparison.json")

    def test_has_versions(self):
        self.assertGreater(len(self.versions), 1)

    def test_versions_have_scores(self):
        for v in self.versions:
            self.assertIn("version", v)
            self.assertIn("technical_score", v)
            self.assertIsInstance(v["technical_score"], (int, float))

    def test_latest_is_best(self):
        scores = [v["technical_score"] for v in self.versions]
        self.assertEqual(max(scores), scores[-1], "Latest version should be best")

    def test_official_baseline_uses_official_kit_artifact(self):
        baseline = self.versions[0]
        self.assertEqual(baseline["version"], "Official Weak BM25 Baseline")
        self.assertEqual(baseline["file"], "docs/baseline_results.json")
        self.assertAlmostEqual(baseline["hit_rate_at_10"], 0.125, places=6)
        self.assertAlmostEqual(baseline["mrr"], 0.068034, places=6)
        self.assertAlmostEqual(baseline["mttc"], 9.81, places=6)
        self.assertAlmostEqual(baseline["technical_score"], 0.10671, places=6)


class OrganicInvariantTests(unittest.TestCase):
    """Validate the actual demo injection path preserves organic ordering."""

    def test_sponsored_injection_preserves_all_organic_results_in_order(self):
        demo = DemoState.__new__(DemoState)
        campaign = {
            "parent_asin": "SPONSORED1",
            "title": "Sponsored product",
            "store": "DemoBrand",
            "price": 10.0,
            "advertiser": "DemoBrand",
            "last_relevance": 0.82,
            "last_ecpm": 0.82,
            "bid": 1.0,
            "budget": 10.0,
            "spend": 0.0,
            "impressions": 0,
        }
        demo._auction = lambda *_args, **_kwargs: [campaign]
        original = [
            {"parent_asin": "A", "title": "Organic A"},
            {"parent_asin": "B", "title": "Organic B"},
            {"parent_asin": "C", "title": "Organic C"},
        ]
        before = [item["parent_asin"] for item in original]

        result = demo._inject_sponsored(
            "session", "query", {"recommendations": list(original)}, top_n=1
        )
        organic_after = [
            item["parent_asin"]
            for item in result["recommendations"]
            if not item.get("sponsored")
        ]

        self.assertEqual(organic_after, before)
        self.assertEqual(result["recommendations"][0]["parent_asin"], "SPONSORED1")
        self.assertTrue(result["recommendations"][0]["sponsored"])


if __name__ == "__main__":
    unittest.main()
