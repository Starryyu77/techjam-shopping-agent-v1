"""Build a portable static Judge Tour for GitHub Pages or any web root."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


_REPO_ROOT = Path(__file__).resolve().parent.parent
_STATIC = _REPO_ROOT / "demo" / "static"
_EVIDENCE = _REPO_ROOT / "demo" / "evidence"
_REPO_URL = "https://github.com/Starryyu77/techjam-shopping-agent-v1"
_BRANCH_URL = _REPO_URL + "/tree/feature/aggressive-v2"
_CUSTOM_DOMAIN = "shopagent.tianuzhang.org"


def build_static_site(output: Path) -> None:
    output = output.resolve()
    if output == _REPO_ROOT or _REPO_ROOT in output.parents and output.name == "demo":
        raise ValueError(f"Refusing unsafe static output path: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    required = [
        _STATIC / "tour.html",
        _STATIC / "tour.css",
        _STATIC / "tour.js",
        _EVIDENCE / "manifest.json",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Static-site source missing: " + ", ".join(missing))

    html = (_STATIC / "tour.html").read_text(encoding="utf-8")
    replacements = {
        'href="/tour.css"': 'href="./tour.css"',
        'src="/tour.js"': 'src="./tour.js"',
        'href="/tour"': 'href="./"',
        'href="/evidence"': 'href="./?step=4"',
        '<a href="/sandbox">Sandbox</a>': f'<a href="{_BRANCH_URL}" target="_blank" rel="noopener">Source</a>',
        'href="/report"': f'href="{_REPO_URL}/blob/feature/aggressive-v2/REPORT.md"',
        'href="/reproduce"': f'href="{_BRANCH_URL}#setup-and-run-any-os-macos--linux--windows"',
    }
    for source, target in replacements.items():
        html = html.replace(source, target)

    (output / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(_STATIC / "tour.css", output / "tour.css")
    shutil.copy2(_STATIC / "tour.js", output / "tour.js")
    shutil.copytree(_EVIDENCE, output / "evidence")
    (output / ".nojekyll").write_text("", encoding="utf-8")
    (output / "CNAME").write_text(_CUSTOM_DOMAIN + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=_REPO_ROOT / "_site")
    args = parser.parse_args()
    build_static_site(args.output)
    print(f"Static site built: {args.output.resolve()}")


if __name__ == "__main__":
    main()
