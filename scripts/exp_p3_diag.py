"""P3 diagnostic: per-session ask-sequence vs turn-to-hit, to find low-value questions."""
import sys, os, json
from collections import Counter, defaultdict
sys.path.insert(0, "agent"); sys.path.insert(0, ".")
os.environ["TECHJAM_CATALOG"] = "data/catalog.jsonl"
from evaluator.local_evaluator import catalog_index, load_jsonl
from evaluator import local_evaluator as EV
from shopping_copilot.official_agent import Agent as OfficialAgent

# Monkey-patch to record ask_attribute per turn per session.
asks = defaultdict(list)
orig_respond = OfficialAgent.respond
def traced(self, session_id, user_message, turn, top_k):
    r = orig_respond(self, session_id, user_message, turn, top_k)
    asks[session_id].append((turn, r.get("ask_attribute")))
    return r
OfficialAgent.respond = traced

samples = load_jsonl("data/public_set.jsonl")
ci, cat, prod = catalog_index("data/catalog.jsonl")
agent = OfficialAgent()
r = EV.evaluate(agent, samples, ci, cat, prod)
try: agent.close()
except Exception: pass

# evaluator returns per-session detail? use scenario_metrics + reconstruct hits from sessions if present
# We at least have MTTC per scenario; here summarize ask distribution per scenario by joining on sample order.
# Map session order: evaluator assigns random session ids; but 'asks' keyed by them. We can't easily map to
# scenario without evaluator detail, so instead summarize global ask frequency and per-scenario MTTC.
sm = r.get("scenario_metrics", {})
print("=== scenario MTTC (lower=better) ===")
for k in sorted(sm):
    print("  %-16s MTTC=%s HR=%.3f MRR=%.3f" % (k, sm[k].get("mttc"), sm[k].get("hit_rate_at_10",0), sm[k].get("mrr",0)))
# ask attribute frequency across all sessions
freq = Counter()
turns_when_asked = defaultdict(list)
for sid, seq in asks.items():
    for turn, attr in seq:
        if attr:
            freq[attr]+=1
            turns_when_asked[attr].append(turn)
print("=== ask_attribute frequency (times asked across 200 sessions) ===")
for attr, c in freq.most_common():
    ts = turns_when_asked[attr]
    print("  %-12s asked %3d times, avg turn asked=%.2f" % (attr, c, sum(ts)/len(ts)))
