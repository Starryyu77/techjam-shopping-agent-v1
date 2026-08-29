from __future__ import annotations
import sys
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
from official_agent import Agent
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
samples=load_jsonl((OFFICIAL/"data"/"public_set.jsonl").resolve())
catalog_ids,categories,products=catalog_index(catalog)
def run(band):
    a=Agent(str(catalog),intent_backend="rules"); a._agent.search.popularity_band=band
    r=evaluate(a,samples,catalog_ids,categories,products); a.close(); return r
for band in [0.0,0.1,0.25,0.5,1.0,1.5,2.0,5.0]:
    r=run(band)
    print(f"band={band:<4} HR={r['hit_rate_at_10']:.4f} MRR={r['mrr']:.4f} MTTC={r['mttc']:.3f} TS={r['recommended_technical_score']:.4f}",flush=True)
