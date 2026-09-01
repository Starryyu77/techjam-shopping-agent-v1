"""Evaluate the minimal ``submission/`` package with the official public evaluator.

This differs from ``tools/evaluate_official.py``: it imports ``submission.agent.Agent``
directly, so it verifies the exact package layout intended for delivery.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--official-root",
        type=Path,
        default=REPO_ROOT.parent / "techjam-conversational-search",
        help="Path to the official participant kit (default: sibling checkout)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional JSON path for the complete evaluator report",
    )
    args = parser.parse_args()

    official_root = args.official_root.resolve()
    evaluator_path = official_root / "evaluator" / "local_evaluator.py"
    catalog = official_root / "data" / "catalog.jsonl"
    dataset = official_root / "data" / "public_set.jsonl"
    missing = [path for path in (evaluator_path, catalog, dataset) if not path.is_file()]
    if missing:
        parser.error("official participant-kit files missing: " + ", ".join(map(str, missing)))

    sys.path.insert(0, str(official_root))
    sys.path.insert(0, str(REPO_ROOT))
    from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
    from submission.agent import Agent

    samples = load_jsonl(dataset)
    catalog_ids, categories, products = catalog_index(catalog)
    agent = Agent(str(catalog))
    try:
        result = evaluate(agent, samples, catalog_ids, categories, products)
    finally:
        agent.close()

    if args.output is not None:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Full report: {output}", file=sys.stderr)

    summary = {key: value for key, value in result.items() if key != "sessions"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
