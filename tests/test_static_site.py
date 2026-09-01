"""Tests for the deployable GitHub Pages bundle."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path


_REPO_ROOT = Path(__file__).resolve().parent.parent


class StaticSiteBuildTests(unittest.TestCase):
    def setUp(self):
        try:
            from scripts.build_static_site import build_static_site
        except ModuleNotFoundError as exc:
            self.fail(f"Static site builder is missing: {exc}")
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.output = Path(self.temp_dir.name) / "site"
        build_static_site(self.output)

    def test_bundle_contains_required_assets(self):
        required = [
            "index.html",
            "tour.css",
            "tour.js",
            "i18n.js",
            ".nojekyll",
            "evidence/manifest.json",
            "evidence/metrics.json",
            "evidence/dataset.json",
            "evidence/version_comparison.json",
            "evidence/prompt_evolution.json",
            "media/shopping-copilot-demo-v3.mp4",
            "media/shopping-copilot-demo-v3-poster.jpg",
            "media/shopping-copilot-demo-v3.en.srt",
            "media/shopping-copilot-demo-v3.zh-CN.srt",
            "media/shopping-copilot-demo-v3.en.vtt",
            "media/shopping-copilot-demo-v3.zh-CN.vtt",
        ]
        for relative in required:
            self.assertTrue((self.output / relative).is_file(), relative)

    def test_bundle_does_not_claim_an_unconfigured_custom_domain(self):
        self.assertFalse((self.output / "CNAME").exists())

    def test_index_uses_project_path_portable_assets(self):
        html = (self.output / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="./tour.css?v=', html)
        self.assertIn('src="./tour.js?v=', html)
        self.assertIn('src="./i18n.js?v=', html)
        self.assertIn('href="./?step=4"', html)
        self.assertNotIn('href="/sandbox"', html)
        self.assertNotIn('href="/report"', html)
        self.assertNotIn('href="/reproduce"', html)
        self.assertIn('<video', html)
        self.assertIn('src="./media/shopping-copilot-demo-v3.mp4"', html)
        self.assertIn('src="./media/shopping-copilot-demo-v3.en.vtt"', html)
        self.assertIn('src="./media/shopping-copilot-demo-v3.zh-CN.vtt"', html)
        self.assertIn('srclang="zh-CN"', html)

    def test_builder_refuses_destructive_repository_output_paths(self):
        from scripts.build_static_site import build_static_site

        for target in [
            _REPO_ROOT,
            _REPO_ROOT.parent,
            _REPO_ROOT.parent.parent,
            _REPO_ROOT / "docs",
            _REPO_ROOT / "docs" / "assets" / "video",
            _REPO_ROOT / "demo" / "static",
        ]:
            with self.subTest(target=target):
                with self.assertRaises(ValueError):
                    build_static_site(target)

    def test_builder_preserves_unmarked_external_directory(self):
        external = Path(self.temp_dir.name) / "existing"
        external.mkdir()
        sentinel = external / "keep.txt"
        sentinel.write_text("keep", encoding="utf-8")
        with self.assertRaises(ValueError):
            from scripts.build_static_site import build_static_site

            build_static_site(external)
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep")

    def test_builder_can_refresh_its_marked_output(self):
        from scripts.build_static_site import build_static_site

        build_static_site(self.output)
        self.assertTrue((self.output / ".shopping-copilot-static-build").is_file())

    def test_bundle_contains_all_public_traces(self):
        traces = list((self.output / "evidence" / "scenarios").glob("public_*.json"))
        self.assertEqual(len(traces), 200)
        manifest = json.loads((self.output / "evidence" / "manifest.json").read_text())
        self.assertEqual(manifest["sample_count"], 200)

    def test_bundle_does_not_contain_local_paths_or_credentials(self):
        forbidden = ["/Users/starryyu", "CLOUDFLARE_API_TOKEN", "gho_"]
        for path in self.output.rglob("*"):
            if not path.is_file() or path.suffix not in {".html", ".js", ".css", ".json"}:
                continue
            text = path.read_text(encoding="utf-8")
            for token in forbidden:
                self.assertNotIn(token, text, f"{token} leaked in {path}")


if __name__ == "__main__":
    unittest.main()
