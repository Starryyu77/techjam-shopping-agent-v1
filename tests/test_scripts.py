"""Repository script discoverability and stable CLI contracts."""
from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"


class ScriptDocumentationTests(unittest.TestCase):
    def test_every_top_level_script_is_listed_in_script_guide(self):
        guide_path = SCRIPTS / "README.md"
        self.assertTrue(guide_path.is_file(), "Missing scripts/README.md")
        guide = guide_path.read_text(encoding="utf-8")
        scripts = sorted(
            path.name for path in SCRIPTS.iterdir()
            if path.is_file() and path.suffix in {".py", ".ps1"}
        )
        for name in scripts:
            self.assertIn(f"`{name}`", guide, name)

    def test_supported_python_entrypoints_have_help(self):
        commands = [
            ["evaluate_official.py", "--help"],
            ["demo/server.py", "--help"],
            ["prompt_lab.py", "--help"],
            ["scripts/build_demo_evidence.py", "--help"],
            ["scripts/build_static_site.py", "--help"],
            ["scripts/run_submission_eval.py", "--help"],
        ]
        for command in commands:
            result = subprocess.run(
                [sys.executable, *command],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            self.assertEqual(result.returncode, 0, f"{command}: {result.stderr}")
            self.assertIn("usage:", result.stdout.lower(), command[0])

    def test_submission_eval_has_portable_output_option(self):
        result = subprocess.run(
            [sys.executable, "scripts/run_submission_eval.py", "--help"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--official-root", result.stdout)
        self.assertIn("--output", result.stdout)


if __name__ == "__main__":
    unittest.main()
