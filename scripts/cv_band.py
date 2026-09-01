from __future__ import annotations
import sys
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
from shopping_copilot.official_agent import Agent
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
samples=load_jsonl((OFFICIAL/"data"/"public_set.jsonl").resolve())
catalog_ids,categories,products=catalog_index(catalog)

# deterministic split by sample_id hash
import hashlib
def half(s): return int(hashlib.md5(s["sample_id"].encode()).hexdigest(),16)%2
A=[s for s in samples if half(s)==0]; B=[s for s in samples if half(s)==1]
print(f"split: A={len(A)} B={len(B)}",flush=True)
def run(subset,band):
    a=Agent(str(catalog),intent_backend="rules"); a._agent.search.popularity_band=band
    r=evaluate(a,subset,catalog_ids,categories,products); a.close(); return r["recommended_technical_score"]
# Tune on A, report both A and B for each band
print("band |  TS_A  |  TS_B  (generalization)",flush=True)
for band in [0.0,1.0,2.0,3.0,4.0,5.0,6.0]:
    ta=run(A,band); tb=run(B,band)
    print(f"{band:<4} | {ta:.4f} | {tb:.4f}",flush=True)
