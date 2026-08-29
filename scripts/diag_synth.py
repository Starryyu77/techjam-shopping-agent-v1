from __future__ import annotations
import sys, uuid, random
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import (catalog_index, materialize_hidden_fields, coarse_category,
    initial_message, customer_reply, normalize_recommendations, MAX_TURNS, TOP_K)
import shopping_agent as SA
from shopping_agent import _terms
from official_agent import Agent
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
catalog_ids,categories,products=catalog_index(catalog)
all_asins=list(products.keys()); rng=random.Random(20260830); rng.shuffle(all_asins)
SCEN=["buying"]*40+["browsing"]*40+["intent_override"]*15+["boundary"]*5

POOL={"asins":set()}
_orig=SA.CatalogSearch.search
def patched(self,state,profile,top_k):
    r,p=_orig(self,state,profile,top_k)
    qv=self._query_values(state,profile)
    terms=list(dict.fromkeys(_terms(" ".join(qv))))[:48]
    if terms:
        expr=" OR ".join('"'+t+'"' for t in terms)
        rows=self.connection.execute("SELECT parent_asin FROM products WHERE products MATCH ? LIMIT ?",(expr,self.recall_pool)).fetchall()
        POOL["asins"].update(str(x[0]) for x in rows)
    return r,p
SA.CatalogSearch.search=patched

def run(agent,sample):
    sid=f"public_{uuid.uuid4().hex}"; agent.reset(sid,sample["user_profile"])
    target=str(sample["ground_truth"]["parent_asin"])
    try: eic,eb=materialize_hidden_fields(sample,products)
    except Exception: return None,None,None
    es={**sample,"intent_card":eic,"behavior":eb}
    disclosed=set(); bu=False; oa=sample["scenario_type"]!="intent_override"
    POOL["asins"]=set()
    um=initial_message(es,coarse_category(categories.get(target,[])),disclosed)
    hit=False
    for turn in range(1,MAX_TURNS+1):
        try: resp=agent.respond(sid,um,turn,TOP_K)
        except Exception: resp={"message":"","ask_attribute":None,"recommendations":[]}
        ranked=normalize_recommendations(resp.get("recommendations"),catalog_ids)
        if oa and target in ranked: hit=True; break
        if turn==MAX_TURNS: break
        ov=es.get("behavior",{}).get("override") or {}
        if not oa and turn+1==int(ov.get("turn",3)):
            oa=True; nv=str(ov.get("new_value",""))
            if nv: disclosed.add(nv)
            um=str(ov.get("message","Actually, ignore my earlier preference. What I need is: "+nv+"."))
        else: um,bu=customer_reply(es,resp.get("ask_attribute"),disclosed,bu)
    recalled = target in POOL["asins"]
    return hit, recalled, eic

agent=Agent(str(catalog),intent_backend="rules")
used=0; recall_miss=0; rank_miss=0; empty_card=0
for asin in all_asins:
    if used>=500: break
    scen=SCEN[used%len(SCEN)]
    sample={"sample_id":f"s{used}","scenario_type":scen,"ground_truth":{"parent_asin":asin},"user_profile":{"preference_tags":[]}}
    hit,recalled,card=run(agent,sample)
    if hit is None: continue
    used+=1
    if not hit:
        if not recalled: recall_miss+=1
        else: rank_miss+=1
        hc=card.get("hard_constraints",[]) if card else []
        sc=card.get("soft_preferences",[]) if card else []
        if not hc and not sc: empty_card+=1
agent.close()
print(f"synthetic misses breakdown (N={used}):")
print(f"  recall misses (target not in pool): {recall_miss}")
print(f"  ranking misses (in pool, not top-10): {rank_miss}")
print(f"  of all misses, with EMPTY intent card (no hard+soft constraints): {empty_card}")
