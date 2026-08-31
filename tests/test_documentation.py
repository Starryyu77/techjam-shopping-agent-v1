"""Cross-document release checks for the public repository."""
from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class PublicDocumentationTests(unittest.TestCase):
    def setUp(self):
        self.readme_en = (ROOT / "README.md").read_text(encoding="utf-8")
        zh_path = ROOT / "README.zh-CN.md"
        self.assertTrue(zh_path.is_file(), "Missing Chinese README")
        self.readme_zh = zh_path.read_text(encoding="utf-8")

    def test_language_switch_is_bidirectional(self):
        self.assertIn("README.zh-CN.md", self.readme_en)
        self.assertIn("README.md", self.readme_zh)
        self.assertIn("简体中文", self.readme_en)
        self.assertIn("English", self.readme_zh)

    def test_live_tour_is_prominent_in_both_languages(self):
        url = "https://shopping-copilot-techjam.pages.dev/"
        self.assertIn(url, self.readme_en)
        self.assertIn(url, self.readme_zh)

    def test_official_baseline_score_is_consistent(self):
        docs = [
            "README.md",
            "README.zh-CN.md",
            "REPORT.md",
            "DEVPOST.md",
            "submission/README.md",
            "demo/VIDEO_SCRIPT.md",
        ]
        for relative in docs:
            text = (ROOT / relative).read_text(encoding="utf-8")
            self.assertNotIn("0.139", text, relative)
            self.assertIn("0.10671", text, relative)

    def test_current_test_count_is_not_stale(self):
        for relative in ["README.md", "README.zh-CN.md", "REPORT.md", "submission/README.md"]:
            text = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("100", text, relative)
            self.assertNotIn("78 current", text, relative)
            self.assertNotIn("64 current", text, relative)
            self.assertNotIn("13 个最小测试", text, relative)

    def test_public_readme_has_no_machine_specific_windows_path(self):
        self.assertNotIn("D:\\TikTok-TechJam", self.readme_en)
        self.assertNotIn("D:\\TikTok-TechJam", self.readme_zh)

    def test_visual_assets_and_mermaid_are_present(self):
        assets = [
            "hero.jpg",
            "data-contract.jpg",
            "intent-override.jpg",
            "override-retain.jpg",
            "override-multislot.jpg",
            "ranking-buying.jpg",
            "ranking-browsing.jpg",
            "ranking-override.jpg",
            "mechanism-lab.jpg",
            "evaluation.jpg",
            "transparent-ads.jpg",
        ]
        for text in [self.readme_en, self.readme_zh]:
            self.assertGreaterEqual(text.count("```mermaid"), 2)
            for asset in assets:
                relative = f"docs/assets/readme/{asset}"
                self.assertIn(relative, text)
                self.assertTrue((ROOT / relative).is_file(), relative)

    def test_override_showcase_is_detailed_in_both_languages(self):
        for text in [self.readme_en, self.readme_zh]:
            for sample_id in [
                "public_0018", "public_0152", "public_0179",
                "public_0049", "public_0007", "public_0063",
                "public_0003", "public_0046", "public_0142",
            ]:
                self.assertIn(sample_id, text)
            self.assertIn("Rank #1", text)
            self.assertIn("Top-10", text)


if __name__ == "__main__":
    unittest.main()
