from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from official_agent import Agent


def _default_official_root() -> Path:
    # Prefer an env override, then a local sibling checkout, then the original
    # Windows dev path. Keeps the repo runnable on any machine (Mac/Linux/CI)
    # without editing source, while preserving the teammate's setup.
    import os

    env = os.environ.get("TECHJAM_OFFICIAL_ROOT")
    if env:
        return Path(env)
    sibling = Path(__file__).resolve().parent.parent / "techjam-conversational-search"
    if (sibling / "evaluator" / "local_evaluator.py").is_file():
        return sibling
    return Path(r"D:\TikTok-TechJam\track4\techjam-conversational-search")


DEFAULT_OFFICIAL_ROOT = _default_official_root()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the V1 agent with the unmodified official public evaluator."
    )
    parser.add_argument("--official-root", type=Path, default=DEFAULT_OFFICIAL_ROOT)
    parser.add_argument("--catalog", type=Path)
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--intent-backend",
        choices=("rules", "model", "hybrid"),
        default="hybrid",
    )
    parser.add_argument("--endpoint", default="http://127.0.0.1:8080/v1")
    parser.add_argument("--model-name", default="qwen3-8b")
    parser.add_argument("--model-timeout", type=float, default=30.0)
    parser.add_argument("--use-reranker", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    official_root = args.official_root.resolve()
    evaluator_path = official_root / "evaluator" / "local_evaluator.py"
    if not evaluator_path.is_file():
        raise FileNotFoundError(evaluator_path)
    sys.path.insert(0, str(official_root))
    from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl

    catalog_path = (args.catalog or official_root / "data" / "catalog.jsonl").resolve()
    dataset_path = (args.dataset or official_root / "data" / "public_set.jsonl").resolve()
    output_path = args.output or Path("reports") / f"official_public_{args.intent_backend}.json"

    samples = load_jsonl(dataset_path)
    catalog_ids, categories, products = catalog_index(catalog_path)
    endpoint = None if args.intent_backend == "rules" else args.endpoint
    agent = Agent(
        catalog_path,
        model_endpoint=endpoint,
        model_name=args.model_name,
        model_timeout=args.model_timeout,
        intent_backend=args.intent_backend,
        use_reranker=args.use_reranker,
    )
    try:
        result = evaluate(agent, samples, catalog_ids, categories, products)
    finally:
        agent.close()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {key: value for key, value in result.items() if key != "sessions"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Full report: {output_path.resolve()}")


if __name__ == "__main__":
    main()
