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

    def test_readmes_explain_the_complete_system_and_script_entrypoints(self):
        self.assertIn("How every stage works", self.readme_en)
        self.assertIn("每个环节如何工作", self.readme_zh)
        for text in [self.readme_en, self.readme_zh]:
            self.assertIn("scripts/README.md", text)
            self.assertIn("run_submission_eval.py", text)
            self.assertIn("build_demo_evidence.py", text)
            self.assertIn("build_static_site.py", text)

    def test_v3_demo_video_is_linked_and_assets_exist(self):
        assets = [
            "shopping-copilot-demo-v3.mp4",
            "shopping-copilot-demo-v3-preview.gif",
            "shopping-copilot-demo-v3-poster.jpg",
            "shopping-copilot-demo-v3.en.srt",
            "shopping-copilot-demo-v3.zh-CN.srt",
            "shopping-copilot-demo-v3.en.vtt",
            "shopping-copilot-demo-v3.zh-CN.vtt",
        ]
        for asset in assets:
            relative = f"docs/assets/video/{asset}"
            self.assertTrue((ROOT / relative).is_file(), relative)
        for text in [self.readme_en, self.readme_zh]:
            self.assertIn("shopping-copilot-demo-v3.mp4", text)
            self.assertIn("shopping-copilot-demo-v3-preview.gif", text)

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
            self.assertIn("94", text, relative)
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
            "prompt-evolution-lab.jpg",
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
            self.assertIn("Prompt Evolution Lab", text)


if __name__ == "__main__":
    unittest.main()
