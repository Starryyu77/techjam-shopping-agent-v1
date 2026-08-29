from __future__ import annotations
import json, sys, uuid, random, re
from pathlib import Path

OFFICIAL = Path("../techjam-conversational-search")
sys.path.insert(0, str(OFFICIAL))
sys.path.insert(0, ".")

from evaluator.local_evaluator import (
    catalog_index, coarse_category, initial_message, customer_reply,
    materialize_hidden_fields, normalize_recommendations, MAX_TURNS, TOP_K,
)
from official_agent import Agent

MISSES = ["public_0020","public_0037","public_0087","public_0144","public_0161","public_0175"]

catalog_path = OFFICIAL / "data" / "catalog.jsonl"
dataset_path = OFFICIAL / "data" / "public_set.jsonl"
catalog_ids, categories, products = catalog_index(catalog_path)
samples = [json.loads(l) for l in dataset_path.open() if l.strip()]
by_id = {s["sample_id"]: s for s in samples}

agent = Agent(str(catalog_path), intent_backend="rules")

for sid in MISSES:
    sample = by_id[sid]
    target = str(sample["ground_truth"]["parent_asin"])
    tgt_product = products[target]
    print("="*70)
    print(f"{sid} | scenario={sample['scenario_type']} | difficulty={sample.get('difficulty_bucket')}")
    print(f"TARGET {target}: {tgt_product.get('title','')[:90]}")
    print(f"  categories: {tgt_product.get('categories')}")
    print(f"  target_coarse_category: {coarse_category(categories.get(target, []))}")
    card, behavior = materialize_hidden_fields(sample, products)
    print(f"  intent_card: {json.dumps(card, ensure_ascii=False)}")

    eff = {**sample, "intent_card": card, "behavior": behavior}
    session_id = f"diag_{uuid.uuid4().hex}"
    agent.reset(session_id, sample["user_profile"])
    disclosed = set(); boundary_used = False
    override_applied = sample["scenario_type"] != "intent_override"
    user_message = initial_message(eff, coarse_category(categories.get(target, [])), disclosed)

    for turn in range(1, MAX_TURNS+1):
        resp = agent.respond(session_id, user_message, turn, TOP_K)
        ranked = normalize_recommendations(resp.get("recommendations"), catalog_ids)
        target_rank = (ranked.index(target)+1) if target in ranked else None
        print(f"  T{turn} USER: {user_message[:80]}")
        print(f"       ASK: {resp.get('ask_attribute')} | AGENT_MSG: {str(resp.get('message',''))[:60]}")
        print(f"       top5: {ranked[:5]} | target_rank_in_top10: {target_rank}")
        if override_applied and target in ranked:
            print(f"       >>> HIT at rank {target_rank}")
            break
        if turn == MAX_TURNS: break
        override = eff.get("behavior",{}).get("override") or {}
        if not override_applied and turn+1 == int(override.get("turn",3)):
            override_applied = True
            nv = str(override.get("new_value",""))
            if nv: disclosed.add(nv)
            user_message = str(override.get("message","Actually ignore earlier."))
        else:
            user_message, boundary_used = customer_reply(eff, resp.get("ask_attribute"), disclosed, boundary_used)
    print()
