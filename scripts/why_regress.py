from __future__ import annotations
import sys, uuid, json
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

# For a regressed case (0009: was rank1, now demoted), what's the state and why does a popular
# distractor tie it? Print the state constraints + target title + the distractor that beats it.
LAST={"policy":[]}
_orig=SA.CatalogSearch.search
def patched(self,state,profile,top_k):
    r,p=_orig(self,state,profile,top_k)
    LAST["policy"]=sorted(p,key=lambda x:(round(x.score/5.0),x.popularity),reverse=True)  # band=5 order
    LAST["state_hard"]=dict(state.hard_constraints); LAST["state_soft"]=dict(state.soft_preferences); LAST["cat"]=state.category
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
        if oa and target in ranked: return target
        if turn==MAX_TURNS: return target
        ov=es.get("behavior",{}).get("override") or {}
        if not oa and turn+1==int(ov.get("turn",3)):
            oa=True; nv=str(ov.get("new_value",""))
            if nv: disclosed.add(nv); um=str(ov.get("message","..."))
        else: um,bu=customer_reply(es,resp.get("ask_attribute"),disclosed,bu)
    return target
a=Agent(str(catalog),intent_backend="rules"); a._agent.search.popularity_band=5.0
for sid in ["public_0009","public_0024"]:
    t=run_one(a,byid[sid])
    print(f"=== {sid} target={t} cat={LAST['cat']} hard={LAST['state_hard']} soft={LAST['state_soft']}")
    for i,c in enumerate(LAST["policy"][:5],1):
        mark="<< TARGET" if c.parent_asin==t else ""
        print(f"  {i}. {c.parent_asin} score={round(c.score,2)} pop={round(c.popularity,2)} nmatch={len(c.matches)} {c.title[:45]} {mark}")
a.close()
