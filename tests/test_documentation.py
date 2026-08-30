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
            self.assertIn("74", text, relative)
            self.assertNotIn("64 current", text, relative)
            self.assertNotIn("13 个最小测试", text, relative)

    def test_public_readme_has_no_machine_specific_windows_path(self):
        self.assertNotIn("D:\\TikTok-TechJam", self.readme_en)
        self.assertNotIn("D:\\TikTok-TechJam", self.readme_zh)


if __name__ == "__main__":
    unittest.main()
