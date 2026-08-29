from __future__ import annotations
import json, sys
from pathlib import Path
OFFICIAL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../techjam-conversational-search")
sys.path.insert(0, str(OFFICIAL))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
from submission.agent import Agent

catalog = (OFFICIAL / "data" / "catalog.jsonl").resolve()
samples = load_jsonl((OFFICIAL / "data" / "public_set.jsonl").resolve())
catalog_ids, categories, products = catalog_index(catalog)
agent = Agent(str(catalog))
try:
    result = evaluate(agent, samples, catalog_ids, categories, products)
finally:
    agent.close()
print(json.dumps({k: v for k, v in result.items() if k != "sessions"}, indent=2))
