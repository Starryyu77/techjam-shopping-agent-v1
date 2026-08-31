from __future__ import annotations

import json
import unittest
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

from prompt_lab import (
    DEFAULT_DATASET,
    ModelRole,
    SemanticJudge,
    _same_model_role,
    build_optimizer_request,
    build_parser,
    decide_candidate,
    evaluate,
    evaluation_system_sha256,
    load_sessions,
    require_heldout_confirmation,
    resolve_model_role,
    validate_candidate_prompt,
    write_round_artifacts,
)
from shopping_agent import (
    Constraint,
    IntentResult,
    ModelUnavailable,
    load_current_prompt,
)


class SequenceParser:
    def __init__(self, outcomes: list[IntentResult | Exception]) -> None:
        self.outcomes = iter(outcomes)

    def parse(self, _message, _state):  # noqa: ANN001
        outcome = next(self.outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class FakeClient:
    def __init__(self, responses: list[str]) -> None:
        self.responses = iter(responses)
        self.calls: list[dict] = []

    def chat(self, messages, *, response_schema=None, max_tokens=400):  # noqa: ANN001
        self.calls.append(
            {
                "messages": messages,
                "response_schema": response_schema,
                "max_tokens": max_tokens,
            }
        )
        return next(self.responses), {"prompt_tokens": 10, "completion_tokens": 5}


def annotation(
    *,
    domain: str = "ITEM",
    act: str = "NEW",
    clarity: str = "L1",
    expected_category: str | None = "shoes",
) -> dict:
    set_items = []
    if expected_category:
        set_items.append(
            {"attribute": "category", "value": expected_category, "bucket": "hard"}
        )
    return {
        "domain_intent": domain,
        "dialogue_act": act,
        "clarity_level": clarity,
        "state_delta": {
            "set": set_items,
            "remove": [],
            "mark_no_preference": [],
        },
        "expected_state": {
            "category": expected_category,
            "hard_constraints": {},
            "soft_preferences": {},
            "negative_constraints": {},
            "no_preference": [],
            "status": "active",
        },
        "should_mutate_state": expected_category is not None,
    }


def session(session_id: str, message: str, expected: dict) -> dict:
    return {
        "session_id": session_id,
        "language": "en-US",
        "turns": [
            {
                "turn": 1,
                "user_message": message,
                "annotation": expected,
            }
        ],
    }


class PromptLabEvaluationTests(unittest.TestCase):
    def test_evaluate_reports_confusions_and_state_only_badcases(self) -> None:
        parser = SequenceParser(
            [
                IntentResult("BENEFIT", "NOOP", "L3", 0.99, "wrong"),
                IntentResult(
                    "ITEM",
                    "NEW",
                    "L1",
                    0.50,
                    "right labels but too uncertain to update state",
                    [Constraint("category", "shoes")],
                ),
                ModelUnavailable("offline"),
            ]
        )
        report = evaluate(
            parser,
            [
                session("s-domain", "find shoes", annotation()),
                session("s-state", "find shoes", annotation()),
                session("s-error", "find shoes", annotation()),
            ],
        )

        self.assertEqual(report["confusions"]["domain_intent"]["ITEM→BENEFIT"], 1)
        self.assertEqual(report["confusions"]["domain_intent"]["ITEM→ERROR"], 1)
        self.assertEqual(report["confusions"]["dialogue_act"]["NEW→NOOP"], 1)
        self.assertEqual(report["confusions"]["clarity_level"]["L1→L3"], 1)
        by_id = {item["session_id"]: item for item in report["badcases"]}
        self.assertIn("rollout_state", by_id["s-state"]["failures"])
        self.assertIn("clarity_level", by_id["s-domain"]["failures"])
        self.assertIn("json_compliance", by_id["s-error"]["failures"])

    def test_invalid_output_counts_expected_slots_as_false_negatives(self) -> None:
        report = evaluate(
            SequenceParser([ModelUnavailable("offline")]),
            [session("s-invalid-slot", "find shoes", annotation())],
        )
        self.assertEqual(report["metrics"]["slot_f1"], 0.0)
        self.assertIn("slot_f1", report["badcases"][0]["failures"])

    def test_semantic_judge_validates_and_normalizes_scores(self) -> None:
        valid = json.dumps(
            {
                "faithfulness": 4,
                "normalization_quality": 3,
                "summary_quality": 2,
                "unsafe_invention": False,
                "reason": "The meaning is preserved.",
            }
        )
        result = SemanticJudge(FakeClient([valid])).score(
            {
                "user_message": "red shoes",
                "state_before": {},
                "expected": {},
                "predicted": {},
            }
        )
        self.assertEqual(result["semantic_quality"], 0.75)
        self.assertEqual(result["semantic_safety"], 1.0)

        invalid = json.dumps(
            {
                "faithfulness": 5,
                "normalization_quality": 3,
                "summary_quality": 2,
                "unsafe_invention": False,
                "reason": "out of range",
            }
        )
        with self.assertRaises(ModelUnavailable):
            SemanticJudge(FakeClient([invalid])).score({})

    def test_selection_requires_the_selected_title_target(self) -> None:
        expected = annotation(act="SELECT", expected_category=None)
        expected["should_mutate_state"] = True
        expected["expected_state"]["status"] = "selected"
        item = session("s-select", 'I\'ll take "Correct Red" item', expected)
        item["ground_truth"] = {"title": "Correct Red Running Shoes"}
        report = evaluate(
            SequenceParser(
                [
                    IntentResult(
                        "ITEM",
                        "SELECT",
                        "L1",
                        0.99,
                        "selected",
                        selected_title="C",
                    )
                ]
            ),
            [item],
        )
        self.assertEqual(report["metrics"]["selection_accuracy"], 0.0)
        self.assertEqual(report["metrics"]["rollout_state_exact"], 0.0)
        self.assertIn("selection_target", report["badcases"][0]["failures"])


class PromptLabGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.before = {
            "composite": 0.80,
            "dual_score": 0.81,
            "domain_accuracy": 0.90,
            "dialogue_act_accuracy": 0.90,
            "clarity_accuracy": 0.90,
            "slot_f1": 0.80,
            "rollout_state_exact": 0.70,
            "json_compliance": 1.0,
            "no_mutation_preservation": 1.0,
            "selection_accuracy": 1.0,
            "semantic_quality": 0.85,
            "semantic_safety": 1.0,
        }

    def test_strict_gate_rejects_any_critical_regression(self) -> None:
        candidate = dict(self.before)
        candidate.update(composite=0.84, dual_score=0.85, slot_f1=0.79)
        decision = decide_candidate(self.before, candidate)
        self.assertFalse(decision["accepted"])
        self.assertTrue(any("slot_f1" in reason for reason in decision["reasons"]))

    def test_strict_gate_accepts_clean_gain(self) -> None:
        candidate = dict(self.before)
        candidate.update(composite=0.82, dual_score=0.83, semantic_quality=0.86)
        decision = decide_candidate(self.before, candidate)
        self.assertTrue(decision["accepted"])
        self.assertEqual(decision["score_metric"], "dual_score")

    def test_dev_gate_can_be_flat_when_nothing_regresses(self) -> None:
        decision = decide_candidate(
            self.before,
            dict(self.before),
            require_improvement=False,
        )
        self.assertTrue(decision["accepted"])

    def test_candidate_prompt_rejects_training_data_copy(self) -> None:
        current = "A" * 400 + " domain_intent dialogue_act Constraint rules Output exactly constraints selected_rank selected_title"
        copied = current + "\nThe user said: DEV SENTINEL SHOPPING MESSAGE"
        badcases = [
            {
                "session_id": "dev-secret-session",
                "user_message": "DEV SENTINEL SHOPPING MESSAGE",
                "failures": ["domain_intent"],
            }
        ]
        with self.assertRaises(ModelUnavailable):
            validate_candidate_prompt(copied, current, badcases)

    def test_candidate_prompt_accepts_a_small_contract_preserving_change(self) -> None:
        current = load_current_prompt()
        candidate = current.replace(
            "If unsure whether a state change is safe",
            "When uncertain whether a state change is safe",
        )
        self.assertEqual(
            validate_candidate_prompt(candidate, current, []),
            candidate,
        )

    def test_current_prompt_is_canonicalized(self) -> None:
        prompt = load_current_prompt()
        self.assertEqual(prompt, prompt.strip())


class PromptLabWorkflowTests(unittest.TestCase):
    def test_bundled_data_supports_optimize_without_heldout_labels(self) -> None:
        self.assertEqual(len(load_sessions(DEFAULT_DATASET, "dev")), 18)
        self.assertEqual(len(load_sessions(DEFAULT_DATASET, "validation")), 6)
        self.assertFalse(
            (DEFAULT_DATASET / "data" / "heldout" / "test_labels.jsonl").exists()
        )

    def test_optimizer_request_is_dev_only_and_scrubs_ids(self) -> None:
        report = {
            "metrics": {"domain_accuracy": 0.5},
            "confusions": {"domain_intent": {"ITEM→BENEFIT": 2}},
            "failure_counts": {"domain_intent": 2, "slot_f1": 0},
            "badcases": [
                {
                    "session_id": "dev-private-id",
                    "turn": 1,
                    "user_message": "DEV ONLY MESSAGE",
                    "state_before": {},
                    "expected": {
                        "domain_intent": "ITEM",
                        "selected_title": "SECRET TARGET FULL TITLE",
                    },
                    "predicted": {"domain_intent": "BENEFIT"},
                    "failures": ["domain_intent"],
                }
            ],
        }
        request = build_optimizer_request("CURRENT PROMPT", report, max_badcases=20)
        self.assertIn("DEV ONLY MESSAGE", request)
        self.assertNotIn("dev-private-id", request)
        self.assertNotIn("parent_asin", request)
        self.assertNotIn("SECRET TARGET FULL TITLE", request)
        self.assertIn("每条规则本轮最多新增 1 条", request)
        self.assertIn("slot_f1", request)

    def test_optimizer_rejects_validation_feedback_across_rounds(self) -> None:
        with self.assertRaises(ValueError):
            build_optimizer_request(
                "CURRENT PROMPT",
                {"failure_counts": {}, "badcases": []},
                max_badcases=1,
                previous_feedback="validation rejected this candidate",
            )

    def test_role_specific_model_settings_override_legacy_fallback(self) -> None:
        parser = build_parser()
        args = parser.parse_args(
            [
                "optimize",
                "--endpoint",
                "http://127.0.0.1:8080/v1",
                "--target-endpoint",
                "http://127.0.0.1:8081/v1",
                "--target-model",
                "student",
                "--optimizer-endpoint",
                "http://127.0.0.1:8082/v1",
                "--optimizer-model",
                "teacher",
            ]
        )
        target = resolve_model_role(args, "target", required=True)
        optimizer = resolve_model_role(args, "optimizer", required=True)
        self.assertEqual(target.endpoint, "http://127.0.0.1:8081/v1")
        self.assertEqual(target.model, "student")
        self.assertEqual(optimizer.endpoint, "http://127.0.0.1:8082/v1")
        self.assertEqual(optimizer.model, "teacher")

    def test_model_role_identity_normalizes_loopback_endpoint_spelling(self) -> None:
        first = ModelRole("http://localhost:8080/v1", "qwen3-8b", 30)
        second = ModelRole(
            "http://127.0.0.1:8080/v1/chat/completions",
            "qwen3-8b",
            30,
        )
        self.assertTrue(_same_model_role(first, second))

    def test_heldout_labels_restore_ground_truth_for_selection_scoring(self) -> None:
        expected = annotation(act="SELECT", expected_category=None)
        inputs = [{"session_id": "heldout", "turns": [{"turn": 1}]}]
        labels = [
            {
                "session_id": "heldout",
                "ground_truth": {"title": "Heldout Product"},
                "turn_annotations": [{"turn": 1, "annotation": expected}],
            }
        ]
        with patch("prompt_lab.read_jsonl", side_effect=[inputs, labels]):
            loaded = load_sessions(Path("unused"), "test")
        self.assertEqual(loaded[0]["ground_truth"]["title"], "Heldout Product")

    def test_heldout_requires_explicit_freeze_confirmation(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["evaluate", "--split", "test"])
        with self.assertRaises(SystemExit):
            require_heldout_confirmation(args)
        args = parser.parse_args(
            ["evaluate", "--split", "test", "--confirm-heldout", "FINAL-FROZEN"]
        )
        args.frozen_system_sha256 = evaluation_system_sha256(args)
        require_heldout_confirmation(args)

    def test_rejected_round_keeps_complete_artifacts(self) -> None:
        round_dir = Path("prompt_round_001")
        with patch.object(Path, "mkdir"), patch.object(
            Path, "write_text", autospec=True
        ) as write_text:
            write_round_artifacts(
                round_dir,
                prompt_before="before\n",
                prompt_candidate="candidate\n",
                dev_report={
                    "metrics": {"composite": 0.8},
                    "badcases": [],
                    "confusions": {},
                },
                validation_before={"metrics": {"composite": 0.8}, "confusions": {}},
                validation_candidate={"metrics": {"composite": 0.7}, "confusions": {}},
                decision={"accepted": False, "reasons": ["regression"]},
            )
            expected = {
                "prompt_before.md",
                "prompt_candidate.md",
                "dev_metrics.json",
                "validation_metrics.json",
                "badcases.json",
                "confusion_matrix.json",
                "semantic_scores.json",
                "prompt_diff.txt",
                "decision.json",
            }
            written = {call.args[0].name for call in write_text.call_args_list}
            self.assertEqual(written, expected)


if __name__ == "__main__":
    unittest.main()
