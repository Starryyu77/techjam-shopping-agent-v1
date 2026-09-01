from __future__ import annotations
import sys, uuid, random, json
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import (catalog_index, materialize_hidden_fields, coarse_category,
    initial_message, customer_reply, normalize_recommendations, behavior_for, intent_card, MAX_TURNS, TOP_K)
from shopping_copilot.official_agent import Agent

catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
catalog_ids,categories,products=catalog_index(catalog)
# products is dict asin->product. Sample targets that have enough structure for an intent card.
all_asins=list(products.keys())
rng=random.Random(20260830)
rng.shuffle(all_asins)

# synth a sample dict like the public set, for each scenario type in the official mix
SCEN=["buying"]*40+["browsing"]*40+["intent_override"]*15+["boundary"]*5
def synth(asin, scen, idx):
    prod=products[asin]
    return {"sample_id":f"synth_{idx}","scenario_type":scen,"ground_truth":{"parent_asin":asin},
            "user_profile":{"preference_tags":[],"summary":"synthetic"}}

def run_session(agent, sample):
    sid=f"public_{uuid.uuid4().hex}"; agent.reset(sid,sample["user_profile"])
    target=str(sample["ground_truth"]["parent_asin"])
    try:
        eic,eb=materialize_hidden_fields(sample,products)
    except Exception:
        return None  # can't synth card for this product
    es={**sample,"intent_card":eic,"behavior":eb}
    disclosed=set(); bu=False; oa=sample["scenario_type"]!="intent_override"
    um=initial_message(es,coarse_category(categories.get(target,[])),disclosed)
    for turn in range(1,MAX_TURNS+1):
        try: resp=agent.respond(sid,um,turn,TOP_K)
        except Exception: resp={"message":"","ask_attribute":None,"recommendations":[]}
        ranked=normalize_recommendations(resp.get("recommendations"),catalog_ids)
        if oa and target in ranked: return 1.0/(ranked.index(target)+1)
        if turn==MAX_TURNS: return 0.0
        ov=es.get("behavior",{}).get("override") or {}
        if not oa and turn+1==int(ov.get("turn",3)):
            oa=True; nv=str(ov.get("new_value",""))
            if nv: disclosed.add(nv)
            um=str(ov.get("message","Actually, ignore my earlier preference. What I need is: "+nv+"."))
        else: um,bu=customer_reply(es,resp.get("ask_attribute"),disclosed,bu)
    return 0.0

N=500
agent=Agent(str(catalog),intent_backend="rules")  # band=5 default
rrs=[]; used=0; i=0
for asin in all_asins:
    if used>=N: break
    scen=SCEN[used%len(SCEN)]
    rr=run_session(agent, synth(asin,scen,used))
    if rr is None: continue
    rrs.append(rr); used+=1
agent.close()
hr=sum(1 for r in rrs if r>0)/len(rrs)
mrr=sum(rrs)/len(rrs)
mttc_proxy=sum((1.0/r if r>0 else 11) for r in rrs)  # not exact; skip
print(f"synthetic N={len(rrs)}: HR@10={hr:.4f} MRR={mrr:.4f}")
print(f"misses={sum(1 for r in rrs if r==0)}")
