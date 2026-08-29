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

# Capture full recalled pool per current session (union over turns).
POOL = {"asins": set()}
_orig = SA.CatalogSearch.search
from shopping_agent import _terms
def patched(self, state, profile, top_k):
    results, policy = _orig(self, state, profile, top_k)
    qv = self._query_values(state, profile)
    terms = list(dict.fromkeys(_terms(" ".join(qv))))[:48]
    if terms:
        expr = " OR ".join('"'+t+'"' for t in terms)
        rows = self.connection.execute(
            "SELECT parent_asin FROM products WHERE products MATCH ? "
            "ORDER BY bm25(products, 0.0, 6.0, 4.0, 3.0, 2.0, 2.0, 1.0, 0.0, 0.0) LIMIT ?",
            (expr, self.recall_pool),
        ).fetchall()
        POOL["asins"].update(str(r[0]) for r in rows)
    return results, policy
SA.CatalogSearch.search = patched

agent = Agent(str(catalog), intent_backend="rules")
recall_hit = 0; recall_miss = []; ranked_hit = 0
for sample in samples:
    session_id = f"public_{uuid.uuid4().hex}"
    agent.reset(session_id, sample["user_profile"])
    target = str(sample["ground_truth"]["parent_asin"])
    eic, eb = materialize_hidden_fields(sample, products)
    es = {**sample, "intent_card": eic, "behavior": eb}
    disclosed = set(); boundary_used = False
    override_applied = sample["scenario_type"] != "intent_override"
    POOL["asins"] = set()
    user_message = initial_message(es, coarse_category(categories.get(target, [])), disclosed)
    got_ranked = False
    for turn in range(1, MAX_TURNS + 1):
        try:
            response = agent.respond(session_id, user_message, turn, TOP_K)
        except Exception:
            response = {"message":"","ask_attribute":None,"recommendations":[]}
        ranked = normalize_recommendations(response.get("recommendations"), catalog_ids)
        if override_applied and target in ranked:
            got_ranked = True; break
        if turn == MAX_TURNS: break
        override = es.get("behavior",{}).get("override") or {}
        if not override_applied and turn+1 == int(override.get("turn",3)):
            override_applied = True
            nv = str(override.get("new_value",""))
            if nv: disclosed.add(nv)
            user_message = str(override.get("message","Actually, please ignore my earlier preference."))
        else:
            user_message, boundary_used = customer_reply(es, response.get("ask_attribute"), disclosed, boundary_used)
    if got_ranked: ranked_hit += 1
    if target in POOL["asins"]:
        recall_hit += 1
    else:
        recall_miss.append((sample["sample_id"], sample["scenario_type"], target))
agent.close()
print(f"RANKED into top-10 (final HR count): {ranked_hit}/{len(samples)}")
print(f"RECALLED into pool (recall_pool={agent._agent.search.recall_pool}): {recall_hit}/{len(samples)}")
print(f"TRUE recall misses (target never in pool): {len(recall_miss)}")
for m in recall_miss: print("  ", m)
