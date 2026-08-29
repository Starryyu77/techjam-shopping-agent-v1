from __future__ import annotations
import json, sys, uuid
from pathlib import Path
OFFICIAL = Path("../techjam-conversational-search"); sys.path.insert(0, str(OFFICIAL)); sys.path.insert(0, ".")
from evaluator.local_evaluator import (
    catalog_index, load_jsonl, materialize_hidden_fields, coarse_category,
    initial_message, customer_reply, normalize_recommendations, MAX_TURNS, TOP_K,
)
import shopping_agent as SA
from official_agent import Agent

catalog = (OFFICIAL / "data" / "catalog.jsonl").resolve()
samples = load_jsonl((OFFICIAL / "data" / "public_set.jsonl").resolve())
catalog_ids, categories, products = catalog_index(catalog)

# Capture the full sorted candidate list (asin, score, n_matches) at the FINAL search of each session.
LAST = {"cands": []}
_orig = SA.CatalogSearch.search
def patched(self, state, profile, top_k):
    results, policy = _orig(self, state, profile, top_k)
    # policy = candidates[:50] sorted; capture asin/score/#matches
    LAST["cands"] = [(c.parent_asin, round(c.score,2), len(c.matches)) for c in policy]
    return results, policy
SA.CatalogSearch.search = patched

agent = Agent(str(catalog), intent_backend="rules")
def find_rank(target):
    for i,(a,_,_) in enumerate(LAST["cands"],1):
        if a==target: return i
    return None

def target_score(target):
    for a,s,m in LAST["cands"]:
        if a==target: return s,m
    return None,None

def run_one(sample):
    session_id=f"public_{uuid.uuid4().hex}"
    agent.reset(session_id, sample["user_profile"])
    target=str(sample["ground_truth"]["parent_asin"])
    eic,eb=materialize_hidden_fields(sample,products)
    es={**sample,"intent_card":eic,"behavior":eb}
    disclosed=set(); boundary_used=False
    override_applied=sample["scenario_type"]!="intent_override"
    um=initial_message(es,coarse_category(categories.get(target,[])),disclosed)
    last_resp=None
    for turn in range(1,MAX_TURNS+1):
        try: response=agent.respond(session_id,um,turn,TOP_K)
        except Exception: response={"message":"","ask_attribute":None,"recommendations":[]}
        last_resp=response
        ranked=normalize_recommendations(response.get("recommendations"),catalog_ids)
        if override_applied and target in ranked: return turn, LAST["cands"], target, ranked.index(target)+1
        if turn==MAX_TURNS: break
        override=es.get("behavior",{}).get("override") or {}
        if not override_applied and turn+1==int(override.get("turn",3)):
            override_applied=True; nv=str(override.get("new_value",""))
            if nv: disclosed.add(nv)
            um=str(override.get("message","Actually, please ignore my earlier preference."))
        else:
            um,boundary_used=customer_reply(es,response.get("ask_attribute"),disclosed,boundary_used)
    return None, LAST["cands"], target, None

# Focus on a few rank>=6 / miss ids
focus_ids={"public_0083","public_0174","public_0194","public_0001","public_0020","public_0161","public_0052"}
by_id={s["sample_id"]:s for s in samples}
for sid in sorted(focus_ids):
    s=by_id[sid]
    hit_turn,cands,target,rank_in_top10=run_one(s)
    # find target position in the 50-pool
    pos=None; tscore=None; tmatch=None
    for i,(a,sc,m) in enumerate(cands,1):
        if a==target: pos,tscore,tmatch=i,sc,m; break
    top3=cands[:3]
    print(f"{sid} [{s['scenario_type']}] pool_rank={pos} score={tscore} matches={tmatch} | top3={[(a[:10],sc,m) for a,sc,m in top3]}")
agent.close()
