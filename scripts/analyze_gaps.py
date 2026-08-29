from __future__ import annotations
import sys, uuid
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import (catalog_index, load_jsonl, materialize_hidden_fields,
    coarse_category, initial_message, customer_reply, normalize_recommendations, MAX_TURNS, TOP_K)
import shopping_agent as SA
from official_agent import Agent
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
samples=load_jsonl((OFFICIAL/"data"/"public_set.jsonl").resolve())
catalog_ids,categories,products=catalog_index(catalog)
byid={s["sample_id"]:s for s in samples}

LAST={"cands":[]}
_orig=SA.CatalogSearch.search
def patched(self,state,profile,top_k):
    r,p=_orig(self,state,profile,top_k)
    # capture full candidates with raw score + popularity BEFORE band sort by re-reading policy(50)
    LAST["cands"]=[(c.parent_asin,round(c.score,3),round(c.popularity,3)) for c in sorted(p,key=lambda x:x.score,reverse=True)]
    return r,p
SA.CatalogSearch.search=patched

def run_one(agent,sample):
    sid=f"public_{uuid.uuid4().hex}"; agent.reset(sid,sample["user_profile"])
    target=str(sample["ground_truth"]["parent_asin"])
    eic,eb=materialize_hidden_fields(sample,products); es={**sample,"intent_card":eic,"behavior":eb}
    disclosed=set(); bu=False; oa=sample["scenario_type"]!="intent_override"
    um=initial_message(es,coarse_category(categories.get(target,[])),disclosed)
    for turn in range(1,MAX_TURNS+1):
        try: resp=agent.respond(sid,um,turn,TOP_K)
        except Exception: resp={"message":"","ask_attribute":None,"recommendations":[]}
        ranked=normalize_recommendations(resp.get("recommendations"),catalog_ids)
        if oa and target in ranked: return LAST["cands"],target
        if turn==MAX_TURNS: break
        ov=es.get("behavior",{}).get("override") or {}
        if not oa and turn+1==int(ov.get("turn",3)):
            oa=True; nv=str(ov.get("new_value",""))
            if nv: disclosed.add(nv)
            um=str(ov.get("message","Actually, please ignore my earlier preference."))
        else: um,bu=customer_reply(es,resp.get("ask_attribute"),disclosed,bu)
    return LAST["cands"],target

a=Agent(str(catalog),intent_backend="rules"); a._agent.search.popularity_band=0.0  # raw scores
for sid in ["public_0009","public_0024","public_0008","public_0161","public_0087"]:
    cands,t=run_one(a,byid[sid])
    # target raw rank + score, and the top raw score
    tpos=next((i for i,(x,_,_) in enumerate(cands,1) if x==t),None)
    ts=next((s for x,s,_ in cands if x==t),None)
    top_s=cands[0][1] if cands else None
    gap=round(top_s-ts,3) if (ts is not None and top_s is not None) else None
    print(f"{sid}: raw target_rank={tpos} target_score={ts} top_score={top_s} gap={gap}")
a.close()
