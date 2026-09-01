from __future__ import annotations
import json, sys, time
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, evaluate, load_jsonl
from shopping_copilot.official_agent import Agent
from shopping_copilot.reranker import CrossEncoderReranker

catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
samples=load_jsonl((OFFICIAL/"data"/"public_set.jsonl").resolve())
catalog_ids,categories,products=catalog_index(catalog)
shared=CrossEncoderReranker()
print("device:", shared._device, flush=True)

def run(weight, window, buying_only):
    agent=Agent(str(catalog), intent_backend="rules")
    s=agent._agent.search
    s.reranker=shared; s.rerank_weight=weight; s.rerank_window=window; s.rerank_buying_only=buying_only
    t0=time.time(); r=evaluate(agent, samples, catalog_ids, categories, products); dt=time.time()-t0
    agent.close()
    return r["hit_rate_at_10"], r["mrr"], r["mttc"], r["recommended_technical_score"], dt

hr,mrr,mttc,ts,dt=run(0.0,40,True); print(f"baseline: HR={hr:.4f} MRR={mrr:.4f} MTTC={mttc:.3f} TS={ts:.4f}", flush=True)
for w in [2.0, 3.0, 4.0, 6.0]:
    hr,mrr,mttc,ts,dt=run(w,40,True)
    print(f"buying-only w={w}: HR={hr:.4f} MRR={mrr:.4f} MTTC={mttc:.3f} TS={ts:.4f} ({dt:.0f}s)", flush=True)
