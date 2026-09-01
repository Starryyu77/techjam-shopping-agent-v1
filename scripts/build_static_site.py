"""Build a portable static Judge Tour for GitHub Pages or any web root."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


_REPO_ROOT = Path(__file__).resolve().parent.parent
_STATIC = _REPO_ROOT / "demo" / "static"
_EVIDENCE = _REPO_ROOT / "demo" / "evidence"
_VIDEO_ASSETS = _REPO_ROOT / "docs" / "assets" / "video"
_REPO_URL = "https://github.com/Starryyu77/techjam-shopping-agent-v1"
_SOURCE_URL = _REPO_URL


def build_static_site(output: Path) -> None:
    output = output.resolve()
    safe_repository_output = (_REPO_ROOT / "_site").resolve()
    if output == _REPO_ROOT or (
        _REPO_ROOT in output.parents and output != safe_repository_output
    ) or output in _REPO_ROOT.parents:
        raise ValueError(f"Refusing unsafe static output path: {output}")
    marker = output / ".shopping-copilot-static-build"
    if output.exists() and output != safe_repository_output and not marker.is_file():
        raise ValueError(f"Refusing to replace unmarked external directory: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    required = [
        _STATIC / "tour.html",
        _STATIC / "tour.css",
        _STATIC / "tour.js",
        _STATIC / "i18n.js",
        _EVIDENCE / "manifest.json",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3-web.mp4",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3-poster.jpg",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3.en.srt",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3.zh-CN.srt",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3.en.vtt",
        _VIDEO_ASSETS / "shopping-copilot-demo-v3.zh-CN.vtt",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Static-site source missing: " + ", ".join(missing))

    html = (_STATIC / "tour.html").read_text(encoding="utf-8")
    replacements = {
        'href="/tour.css"': 'href="./tour.css"',
        'src="/tour.js"': 'src="./tour.js"',
        'src="/i18n.js"': 'src="./i18n.js"',
        'href="/tour"': 'href="./"',
        'href="/evidence"': 'href="./?step=4"',
        '<a href="/sandbox">Sandbox</a>': f'<a href="{_SOURCE_URL}" target="_blank" rel="noopener">Source</a>',
        'href="/report"': f'href="{_REPO_URL}/blob/main/docs/technical/REPORT.md"',
        'href="/reproduce"': f'href="{_SOURCE_URL}#quick-start"',
    }
    for source, target in replacements.items():
        html = html.replace(source, target)

    (output / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(_STATIC / "tour.css", output / "tour.css")
    shutil.copy2(_STATIC / "tour.js", output / "tour.js")
    shutil.copy2(_STATIC / "i18n.js", output / "i18n.js")
    shutil.copytree(_EVIDENCE, output / "evidence")
    media = output / "media"
    media.mkdir()
    shutil.copy2(
        _VIDEO_ASSETS / "shopping-copilot-demo-v3-web.mp4",
        media / "shopping-copilot-demo-v3.mp4",
    )
    for filename in [
        "shopping-copilot-demo-v3-poster.jpg",
        "shopping-copilot-demo-v3.en.srt",
        "shopping-copilot-demo-v3.zh-CN.srt",
        "shopping-copilot-demo-v3.en.vtt",
        "shopping-copilot-demo-v3.zh-CN.vtt",
    ]:
        shutil.copy2(_VIDEO_ASSETS / filename, media / filename)
    (output / ".nojekyll").write_text("", encoding="utf-8")
    (output / ".shopping-copilot-static-build").write_text("generated\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=_REPO_ROOT / "_site")
    args = parser.parse_args()
    build_static_site(args.output)
    print(f"Static site built: {args.output.resolve()}")


if __name__ == "__main__":
    main()
