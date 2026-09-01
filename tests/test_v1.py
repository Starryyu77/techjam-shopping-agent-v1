from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools.chat import build_parser
from shopping_copilot.official_agent import Agent as OfficialAgent
from shopping_copilot.shopping_agent import (
    CatalogSearch,
    LocalModelClient,
    PromptIntentParser,
    RealWorldShoppingAgent,
    RuleIntentParser,
    ShoppingState,
)


class FakeClient:
    def __init__(self, responses: list[str]) -> None:
        self.responses = iter(responses)

    def chat(self, messages, *, response_schema=None, max_tokens=400):  # noqa: ANN001
        return next(self.responses), {"prompt_tokens": 12, "completion_tokens": 8}


class V1Tests(unittest.TestCase):
    def test_cli_defaults_to_local_qwen_hybrid(self) -> None:
        args = build_parser().parse_args([])
        self.assertEqual(args.intent_backend, "hybrid")
        self.assertEqual(args.model_endpoint, "http://127.0.0.1:8080/v1")

    def test_multiturn_search_offtopic_and_title_selection(self) -> None:
        catalog = Path(__file__).parent / "fixtures" / "catalog.jsonl"
        agent = RealWorldShoppingAgent(catalog, intent_backend="rules")
        try:
            agent.reset("s1")
            first = agent.respond("s1", "我想买跑鞋，必须透气。")
            self.assertTrue(any(item["parent_asin"] == "B000000001" for item in first["recommendations"]))
            self.assertTrue(any(item["parent_asin"] == "B000000004" for item in first["recommendations"]))
            no_info = agent.respond(
                "s1",
                "Those options are not quite right yet. Ask me about one specific attribute.",
            )
            self.assertEqual(no_info["ask_attribute"], "other")
            before = agent.sessions["s1"].prompt_view()
            off_topic = agent.respond("s1", "顺便问一下，明天会下雨吗？")
            self.assertEqual(off_topic["intent"]["domain_intent"], "IRRELEVANT")
            self.assertEqual(before, agent.sessions["s1"].prompt_view())
            selected = agent.respond(
                "s1",
                "我决定选标题以“AirFlow Running Shoes”开头的那款。",
            )
            self.assertEqual(selected["state"]["selected_asin"], "B000000001")
            self.assertEqual(selected["state"]["status"], "selected")
        finally:
            agent.close()

    def test_model_json_is_validated_and_retried(self) -> None:
        valid = {
            "domain_intent": "ITEM",
            "dialogue_act": "ADD",
            "clarity_level": "L1",
            "confidence": 0.9,
            "summary": "Adds breathable",
            "constraints": [
                {
                    "attribute": "feature",
                    "value": "breathable",
                    "operation": "set",
                    "hardness": "soft",
                }
            ],
            "selected_rank": None,
            "selected_title": None,
        }
        parser = PromptIntentParser(FakeClient(["not json", json.dumps(valid)]), "prompt")
        result = parser.parse("希望透气", ShoppingState())
        self.assertEqual(result.constraints[0].value, "breathable")
        self.assertEqual(result.source, "model")

    def test_remote_model_endpoint_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            LocalModelClient("https://example.com/v1")
        with self.assertRaises(ValueError):
            LocalModelClient("http://localhost/unexpected/v1")

    def test_rule_parser_keeps_title_reference(self) -> None:
        result = RuleIntentParser().parse(
            "选标题以“Sterling Silver Gift Earrings”开头的那款。",
            ShoppingState(),
        )
        self.assertEqual(result.dialogue_act, "SELECT")
        self.assertEqual(result.selected_title, "Sterling Silver Gift Earrings")

    def test_rule_parser_handles_official_no_information_replies(self) -> None:
        parser = RuleIntentParser()
        state = ShoppingState(last_question="material")
        no_preference = parser.parse(
            "I don't have an additional preference for material.",
            state,
        )
        self.assertEqual(no_preference.dialogue_act, "NOOP")
        boundary = parser.parse(
            "I don't have a preference for material; please use your judgment.",
            state,
        )
        self.assertEqual(boundary.dialogue_act, "NO_PREFERENCE")
        self.assertEqual(boundary.constraints[0].attribute, "material")
        retry = parser.parse(
            "Those options are not quite right yet. Ask me about one specific attribute.",
            state,
        )
        self.assertEqual(retry.dialogue_act, "NOOP")
        self.assertGreaterEqual(retry.confidence, 0.75)

    def test_official_browsing_does_not_find_ring_inside_exploring(self) -> None:
        result = RuleIntentParser().parse(
            "I'm looking for Women Dresses, but I'm still exploring.",
            ShoppingState(),
        )
        categories = [
            item.value for item in result.constraints if item.attribute == "category"
        ]
        self.assertEqual(categories, ["dresses"])

        detailed = RuleIntentParser().parse(
            "I'm looking for Boots Mid-Calf, but I'm still exploring.",
            ShoppingState(),
        )
        self.assertEqual(
            [item.value for item in detailed.constraints if item.attribute == "category"],
            ["boots"],
        )
        self.assertEqual(detailed.retrieval_evidence, [("Boots Mid-Calf", "hard")])

    def test_value_matching_does_not_find_red_inside_preferred(self) -> None:
        result = RuleIntentParser().parse(
            "I'm looking for Shoes Slippers. I preferred a classic style.",
            ShoppingState(),
        )
        colors = [item.value for item in result.constraints if item.attribute == "color"]
        self.assertEqual(colors, [])

    def test_official_answer_preserves_each_raw_clause(self) -> None:
        result = RuleIntentParser().parse(
            "For that, what matters is: polyester; 100% Polyester; Drawstring closure.",
            ShoppingState(last_question="feature"),
        )
        values = {item.value for item in result.constraints}
        self.assertIn("polyester", values)
        self.assertNotIn("Drawstring closure", values)
        self.assertEqual(
            result.retrieval_evidence,
            [("100% Polyester", "hard"), ("Drawstring closure", "hard")],
        )

        raw_only = RuleIntentParser().parse(
            "For that, what matters is: Buckle closure.",
            ShoppingState(last_question="feature"),
        )
        self.assertEqual(raw_only.domain_intent, "ITEM")
        self.assertEqual(raw_only.dialogue_act, "ANSWER")
        self.assertEqual(raw_only.retrieval_evidence, [("Buckle closure", "hard")])

    def test_no_information_after_other_does_not_repeat_other(self) -> None:
        catalog = Path(__file__).parent / "fixtures" / "catalog.jsonl"
        agent = RealWorldShoppingAgent(catalog, intent_backend="rules")
        try:
            agent.reset("other-loop")
            agent.respond("other-loop", "我想买跑鞋，必须透气。")
            state = agent.sessions["other-loop"]
            state.asked_attributes.add("other")
            state.last_question = "other"
            response = agent.respond(
                "other-loop",
                "I don't have an additional preference for other.",
            )
            self.assertNotEqual(response["ask_attribute"], "other")
        finally:
            agent.close()

    def test_catalog_reranker_uses_details_and_word_boundaries(self) -> None:
        catalog = Path(__file__).parent / "fixtures" / "catalog.jsonl"
        search = CatalogSearch(catalog)
        try:
            state = ShoppingState(
                category="belts",
                retrieval_evidence=[("Buckle closure", "hard")],
            )
            results, _ = search.search(state, {}, top_k=10)
            product = next(item for item in results if item.parent_asin == "B000000005")
            self.assertIn("buckle closure", product.text)
            self.assertIn(("evidence", "Buckle closure"), product.matches)

            preferred = ShoppingState(
                category="belts",
                hard_constraints={"color": ["red"]},
            )
            results, _ = search.search(preferred, {}, top_k=10)
            product = next(item for item in results if item.parent_asin == "B000000006")
            self.assertNotIn(("color", "red"), product.matches)
        finally:
            search.close()

    def test_official_override_removes_the_earlier_soft_preference(self) -> None:
        parser = RuleIntentParser()
        state = ShoppingState()
        state.apply(
            parser.parse(
                "I'm looking for Shoes Slippers. plush mule comfort.",
                state,
            )
        )
        self.assertTrue(state.soft_preferences)
        state.apply(
            parser.parse(
                "Actually, ignore my earlier preference. What I need is: Rubber sole.",
                state,
            )
        )
        self.assertFalse(
            any("plush mule comfort" in value for values in state.soft_preferences.values() for value in values)
        )

    def test_official_adapter_returns_only_contract_fields_and_top_ten(self) -> None:
        catalog = Path(__file__).parent / "fixtures" / "catalog.jsonl"
        agent = OfficialAgent(catalog, intent_backend="rules")
        try:
            agent.reset("official-session", {})
            response = agent.respond(
                "official-session",
                "I'm looking for Athletic Running, but I'm still exploring.",
                1,
                10,
            )
            self.assertEqual(
                set(response),
                {"message", "ask_attribute", "recommendations", "usage"},
            )
            self.assertLessEqual(len(response["recommendations"]), 10)
            self.assertTrue(
                all(set(item) <= {"parent_asin", "score"} for item in response["recommendations"])
            )
            with self.assertRaises(ValueError):
                agent.respond("official-session", "running shoes", 1, 5)
        finally:
            agent.close()


class NaturalLanguageTests(unittest.TestCase):
    def test_contextual_short_answer_size(self) -> None:
        parser = RuleIntentParser()
        state = ShoppingState()
        state.category = "shoes"
        state.last_question = "size"
        result = parser.parse("42", state)
        self.assertEqual(result.dialogue_act, "ANSWER")
        self.assertTrue(
            any(c.attribute == "size" and c.value == "42" for c in result.constraints),
            "bare '42' after a size question should be captured as size",
        )

    def test_contextual_short_answer_ignored_without_pending_question(self) -> None:
        # No pending question -> a bare number must NOT be forced into a size slot.
        parser = RuleIntentParser()
        state = ShoppingState()
        state.category = "shoes"
        state.last_question = None
        result = parser.parse("42", state)
        self.assertFalse(
            any(c.attribute == "size" for c in result.constraints),
            "bare number without a pending size question must not become a size",
        )

    def test_english_exit_intent_stops(self) -> None:
        parser = RuleIntentParser()
        result = parser.parse("i dont want buy shoes now", ShoppingState())
        self.assertEqual(result.dialogue_act, "STOP")

    def test_category_typo_is_normalized(self) -> None:
        parser = RuleIntentParser()
        # "close" is a common misspelling of "clothes".
        self.assertEqual(parser._category("i want buy close"), "clothing")
        # A correctly spelled word is unaffected.
        self.assertEqual(parser._category("i want a dress"), "dresses")

    def test_official_answer_template_still_wins(self) -> None:
        # The evaluator template must keep taking the official ANSWER path, not the
        # new contextual-answer path (regression guard for the frozen score).
        parser = RuleIntentParser()
        state = ShoppingState()
        state.category = "shoes"
        state.last_question = "material"
        result = parser.parse("For that, what matters is: leather.", state)
        self.assertEqual(result.dialogue_act, "ANSWER")


if __name__ == "__main__":
    unittest.main()
