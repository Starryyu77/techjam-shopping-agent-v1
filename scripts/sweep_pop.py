from __future__ import annotations
import json, sys
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
from official_agent import Agent
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
samples=load_jsonl((OFFICIAL/"data"/"public_set.jsonl").resolve())
catalog_ids,categories,products=catalog_index(catalog)
def run(band):
    a=Agent(str(catalog),intent_backend="rules")
    a._agent.search.popularity_band=band
    r=evaluate(a,samples,catalog_ids,categories,products); a.close()
    return r
for band in [4.5,4.75,5.0,5.25,5.5]:
    r=run(band)
    sc=r["scenario_metrics"]
    print(f"band={band}: HR={r['hit_rate_at_10']:.4f} MRR={r['mrr']:.4f} MTTC={r['mttc']:.3f} TS={r['recommended_technical_score']:.4f} | buy_HR={sc['buying']['hit_rate_at_10']:.3f} brow_HR={sc['browsing']['hit_rate_at_10']:.3f} ovr_HR={sc['intent_override']['hit_rate_at_10']:.3f}",flush=True)
