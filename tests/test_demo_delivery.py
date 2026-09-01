"""Delivery-contract tests for the judge-facing demo."""
from __future__ import annotations

import threading
import unittest
import urllib.error
import urllib.request
import re
from http.server import HTTPServer
from pathlib import Path

from demo.server import make_handler


_REPO_ROOT = Path(__file__).resolve().parent.parent


class DemoRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), make_handler(object()))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def _get(self, path: str) -> tuple[int, str]:
        try:
            with urllib.request.urlopen(self.base + path, timeout=3) as response:
                return response.status, response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read().decode("utf-8")

    def _get_bytes(self, path: str) -> tuple[int, bytes, str]:
        try:
            with urllib.request.urlopen(self.base + path, timeout=3) as response:
                return response.status, response.read(32), response.headers.get_content_type()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read(32), exc.headers.get_content_type()

    def test_evidence_route_is_not_broken(self):
        status, body = self._get("/evidence")
        self.assertEqual(status, 200)
        self.assertIn("Shopping Copilot", body)

    def test_tour_deep_link_query_serves_tour(self):
        status, body = self._get("/?step=3")
        self.assertEqual(status, 200)
        self.assertIn("Shopping Copilot", body)

    def test_i18n_asset_is_served(self):
        status, body = self._get("/i18n.js")
        self.assertEqual(status, 200)
        self.assertIn("ShoppingCopilotI18n", body)

    def test_report_route_serves_the_technical_report(self):
        status, body = self._get("/report")
        self.assertEqual(status, 200)
        self.assertIn("Technical Report", body)

    def test_reproduce_route_serves_readme(self):
        status, body = self._get("/reproduce")
        self.assertEqual(status, 200)
        self.assertIn("Conversational Shopping Copilot", body)

    def test_v3_demo_poster_is_served_from_media_route(self):
        status, body, content_type = self._get_bytes(
            "/media/shopping-copilot-demo-v3-poster.jpg"
        )
        self.assertEqual(status, 200)
        self.assertEqual(content_type, "image/jpeg")
        self.assertTrue(body.startswith(b"\xff\xd8\xff"))

    def test_v3_webvtt_subtitle_is_served_with_standard_mime(self):
        status, body, content_type = self._get_bytes(
            "/media/shopping-copilot-demo-v3.zh-CN.vtt"
        )
        self.assertEqual(status, 200)
        self.assertEqual(content_type, "text/vtt")
        self.assertTrue(body.startswith(b"WEBVTT"))


class TourDeliveryMarkupTests(unittest.TestCase):
    def setUp(self):
        self.html = (_REPO_ROOT / "demo" / "static" / "tour.html").read_text(encoding="utf-8")
        self.js = (_REPO_ROOT / "demo" / "static" / "tour.js").read_text(encoding="utf-8")
        self.css = (_REPO_ROOT / "demo" / "static" / "tour.css").read_text(encoding="utf-8")

    def test_closeout_internal_links_are_real_routes(self):
        self.assertIn('href="/report" id="linkReport"', self.html)
        self.assertIn('href="/reproduce" id="linkReproduce"', self.html)
        self.assertNotIn('href="#" id="linkReport"', self.html)
        self.assertNotIn('href="#" id="linkReproduce"', self.html)

    def test_direct_file_open_redirects_to_the_hosted_tour(self):
        self.assertIn("window.location.protocol === 'file:'", self.html)
        self.assertIn("https://shopping-copilot-techjam.pages.dev/", self.html)
        self.assertIn("window.location.replace", self.html)

    def test_tour_uses_frozen_canonical_cases(self):
        self.assertIn("manifest.canonical_cases", self.js)
        self.assertNotIn("Prefer multi-turn cases for richer visual", self.js)
        for element_id in ["mechanismContext", "mechanismPipeline", "mechanismEvidence", "mechanismVisual", "mechanismEvidenceData", "scoreAnatomy"]:
            self.assertIn(f'id="{element_id}"', self.html)
        for element_id in ["mechanismModeTabs", "promptEvolutionLab", "promptMetricComparison", "promptMetricTable", "promptCaseSelector", "promptCaseFlow", "promptRunSimulation"]:
            self.assertIn(f'id="{element_id}"', self.html)
        self.assertIn("mechanismDefinitions", self.js)
        self.assertIn("renderMechanismDetail", self.js)
        self.assertIn("renderMechanismVisual", self.js)
        self.assertIn("renderSchemeBPromptLab", self.js)
        self.assertIn("renderPromptMetrics", self.js)
        self.assertIn("renderPromptSimulation", self.js)
        self.assertIn("candidate_pool_size", self.js)
        self.assertIn("coverage × entropy", self.js)
        self.assertIn("3 / (rank + 1)", self.js)
        for visual_class in ["visual-route-map", "visual-state-flow", "visual-recall-funnel", "visual-rank-podium", "visual-question-flow"]:
            self.assertIn(visual_class, self.js)

    def test_ad_invariant_renders_actual_before_and_after_lists(self):
        self.assertIn('id="organicBeforeList"', self.html)
        self.assertIn('id="organicAfterList"', self.html)
        self.assertIn("organicBefore", self.js)
        self.assertIn("organicAfter", self.js)

    def test_override_replay_supports_multiple_cases_and_full_state_summary(self):
        self.assertIn('id="caseSelector"', self.html)
        self.assertIn('id="overrideSummary"', self.html)
        self.assertIn('id="rankJourney"', self.html)
        self.assertIn('id="recommendationDelta"', self.html)
        self.assertIn("canonicalCasesByScenario", self.js)
        self.assertIn("renderOverrideSummary", self.js)
        self.assertIn("renderRankJourney", self.js)
        self.assertIn("renderRecommendationDelta", self.js)
        self.assertIn("loadScenario(scenarioType, button.dataset.sampleId)", self.js)
        self.assertNotIn("loadScenario('intent_override', button.dataset.sampleId)", self.js)
        self.assertNotIn("#step2 .case-choice > span:not(.case-index) { display: none; }", self.css)
        self.assertIn("Compact ranking readability at the default 1280×720 viewport", self.css)
        for label in ["Before override", "Removed", "Retained", "Added", "After override", "Rank progression"]:
            self.assertIn(label, self.js)

    def test_bilingual_tour_contract_is_complete(self):
        i18n_path = _REPO_ROOT / "demo" / "static" / "i18n.js"
        self.assertTrue(i18n_path.is_file())
        i18n = i18n_path.read_text(encoding="utf-8")
        self.assertIn('id="languageToggle"', self.html)
        self.assertIn('src="/i18n.js"', self.html)
        self.assertIn("ShoppingCopilotI18n", i18n)
        self.assertIn("URLSearchParams", i18n)
        self.assertIn("MutationObserver", i18n)
        self.assertIn("return 'en';", i18n)
        self.assertNotIn("window.localStorage.getItem", i18n)
        self.assertNotIn("window.navigator.language", i18n)
        for translated_label in [
            "结果", "数据合同", "场景回放", "机制检查", "评测证据",
            "透明广告", "交付物与局限", "提示词演化实验室",
            "比赛证据", "私有 800 个会话",
        ]:
            self.assertIn(translated_label, i18n)

    def test_scheme_b_prompt_lab_is_visible_and_traceable(self):
        for element_id in [
            "promptScoreHero", "promptMetricComparison", "promptMetricTable",
            "promptGateFlow", "promptContractDiff",
        ]:
            self.assertIn(f'id="{element_id}"', self.html)
        self.assertIn("renderSchemeBPromptLab", self.js)
        self.assertIn("source_branch", self.js)
        self.assertIn("heldout", self.js)

    def test_dark_evidence_palette_meets_wcag_aa(self):
        def color(name: str) -> tuple[int, int, int]:
            match = re.search(rf"{re.escape(name)}:\s*(#[0-9a-fA-F]{{6}})", self.css)
            self.assertIsNotNone(match, name)
            value = match.group(1)
            return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))

        def luminance(rgb: tuple[int, int, int]) -> float:
            channels = []
            for component in rgb:
                value = component / 255
                channels.append(value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4)
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]

        def contrast(first: tuple[int, int, int], second: tuple[int, int, int]) -> float:
            high, low = sorted((luminance(first), luminance(second)), reverse=True)
            return (high + 0.05) / (low + 0.05)

        dark_plate = color("--dark-plate")
        for token in ["--dark-text-primary", "--dark-text-secondary", "--dark-text-muted"]:
            self.assertGreaterEqual(contrast(color(token), dark_plate), 4.5, token)
        self.assertIn(".rank-journey", self.css)
        self.assertIn(".mechanism-context", self.css)
        self.assertIn(".mechanism-pipeline", self.css)
        self.assertIn(".score-anatomy", self.css)


if __name__ == "__main__":
    unittest.main()
