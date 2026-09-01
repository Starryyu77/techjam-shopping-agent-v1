"""D1 feasibility: drive each session like the evaluator, check target recall reachability.
ground_truth is used ONLY as an offline diagnostic oracle (never fed to the agent)."""
import sys, os, json
from collections import Counter
sys.path.insert(0, "agent"); sys.path.insert(0, ".")
os.environ["TECHJAM_CATALOG"] = "data/catalog.jsonl"
from evaluator.local_evaluator import catalog_index, load_jsonl, behavior_for, MAX_TURNS, TOP_K
from evaluator import local_evaluator as EV
from shopping_copilot.official_agent import Agent as OfficialAgent
import random

samples = load_jsonl("data/public_set.jsonl")
ci, cat, prod = catalog_index("data/catalog.jsonl")
agent = OfficialAgent()
inner = agent._agent

# categories: is target in full recall pool at hit-time / final turn, and its rank there?
in_pool_hit = 0        # target appeared in top-10 (a hit)
in_pool_nothit = 0     # target in full pool but ranked >10 (rerank territory - dead per P1)
not_in_pool = 0        # target NEVER in recall pool (agentic query-gen COULD help)
ranks_when_in_pool = []

for s in samples:
    tgt = s["ground_truth"]["parent_asin"]
    in_full = False; full_rank = None
    # Let the evaluator drive the full multi-turn session for this one sample.
    r = EV.evaluate(agent, [s], ci, cat, prod)
    # after this, inner.last_results[sid?]; but session id inside evaluate is random.
    # Grab the most recent pool from inner.last_results (whatever session it used)
    pools = list(inner.last_results.values())
    pool = pools[-1] if pools else []
    asins = [c.parent_asin for c in pool]
    if tgt in asins:
        full_rank = asins.index(tgt) + 1
        in_full = True
    # Was it a hit (rank<=10)?
    hit = r["hit_rate_at_10"] > 0
    if hit:
        in_pool_hit += 1
        ranks_when_in_pool.append(r.get("mrr",0))
    elif in_full:
        in_pool_nothit += 1
        ranks_when_in_pool.append(1.0/full_rank if full_rank else 0)
    else:
        not_in_pool += 1

try: agent.close()
except Exception: pass
n=len(samples)
print("=== D1 recall reachability (n=%d) ===" % n)
print("target HIT in top-10:          %d (%.1f%%)" % (in_pool_hit, 100*in_pool_hit/n))
print("target in pool but rank>10:    %d (%.1f%%)  <- rerank territory (P1 showed dead)" % (in_pool_nothit, 100*in_pool_nothit/n))
print("target NOT in recall pool:     %d (%.1f%%)  <- agentic query-gen COULD help here" % (not_in_pool, 100*not_in_pool/n))
