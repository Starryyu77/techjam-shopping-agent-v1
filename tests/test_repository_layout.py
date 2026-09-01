"""Repository-root organization and import compatibility contracts."""
from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class RepositoryLayoutTests(unittest.TestCase):
    def test_repository_root_keeps_only_entrypoint_markdown(self):
        markdown = {path.name for path in ROOT.glob("*.md")}
        self.assertEqual(markdown, {"AGENTS.md", "README.md", "README.zh-CN.md"})
        self.assertEqual(list(ROOT.glob("*.py")), [])

    def test_project_documents_are_grouped_under_docs(self):
        for relative in [
            "docs/project/PLANS.md",
            "docs/product/PRODUCT.md",
            "docs/technical/REPORT.md",
            "docs/submission/DEVPOST.md",
        ]:
            self.assertTrue((ROOT / relative).is_file(), relative)

    def test_core_modules_are_importable_from_package(self):
        code = (
            "from shopping_copilot.shopping_agent import RealWorldShoppingAgent; "
            "from shopping_copilot.official_agent import Agent; "
            "from shopping_copilot.reranker import CrossEncoderReranker; "
            "print(Agent.__name__)"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Agent", result.stdout)

    def test_cli_tools_keep_stable_help_contracts(self):
        for relative in ["tools/chat.py", "tools/evaluate_official.py", "tools/prompt_lab.py"]:
            result = subprocess.run(
                [sys.executable, relative, "--help"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            self.assertEqual(result.returncode, 0, f"{relative}: {result.stderr}")
            self.assertIn("usage:", result.stdout.lower())


if __name__ == "__main__":
    unittest.main()
