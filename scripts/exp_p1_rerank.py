"""P1: LLM/BGE semantic reranking experiment (offline, on GPU box).

Plugs a stronger reranker (BGE-reranker-v2-m3) into the EXISTING agent rerank
surface (reranker= param), runs the unmodified official evaluator on the public
200 set, and reports metrics OVERALL and PER SCENARIO vs the rules baseline.

Rationale: prior D7/D8 found the bundled ms-marco-MiniLM cross-encoder does not
beat rules on the composite (helps Buying, hurts Browsing). This tests whether a
much stronger reranker changes that verdict, and under which gating.
"""
import sys, os, json, time, argparse
sys.path.insert(0, "agent"); sys.path.insert(0, ".")
os.environ["TECHJAM_CATALOG"] = "data/catalog.jsonl"

from evaluator.local_evaluator import catalog_index, load_jsonl, MAX_TURNS, TOP_K
from evaluator import local_evaluator as EV
from shopping_copilot.official_agent import Agent as OfficialAgent
from shopping_copilot import shopping_agent as SA


class BGEReranker:
    """Same interface as CrossEncoderReranker: .available, .score(query, docs)."""
    def __init__(self, model_name="BAAI/bge-reranker-v2-m3", device="cuda"):
        self.available = False
        try:
            from FlagEmbedding import FlagReranker
            self.model = FlagReranker(model_name, use_fp16=True)
            self.available = True
            self.name = model_name
        except Exception as e:
            print("BGE load failed:", e, file=sys.stderr)
            self.model = None

    def score(self, query, documents):
        if not self.model:
            return []
        try:
            pairs = [[query, d] for d in documents]
            out = self.model.compute_score(pairs, normalize=True)
            if isinstance(out, float):
                out = [out]
            return [float(x) for x in out]
        except Exception as e:
            print("BGE score failed:", e, file=sys.stderr)
            return []


def run(reranker, buying_only, weight, window, label):
    samples = load_jsonl("data/public_set.jsonl")
    ci, cat, prod = catalog_index("data/catalog.jsonl")
    agent = OfficialAgent()
    inner = agent._agent  # RealWorldShoppingAgent
    if reranker is not None:
        inner.search.reranker = reranker
        inner.search.rerank_buying_only = buying_only
        inner.search.rerank_weight = weight
        inner.search.rerank_window = window
    t0 = time.time()
    r = EV.evaluate(agent, samples, ci, cat, prod)
    dt = time.time() - t0
    try: agent.close()
    except Exception: pass
    print(f"[{label}] TS=%.4f HR=%.4f MRR=%.4f MTTC=%.3f  ({dt:.1f}s)" % (
        r["recommended_technical_score"], r["hit_rate_at_10"], r["mrr"], r["mttc"]))
    # per-scenario breakdown
    sm = r.get("scenario_metrics", {})
    for name in sorted(sm):
        m = sm[name]
        print("   %-16s HR=%.3f MRR=%.3f MTTC=%s" % (
            name, m.get("hit_rate_at_10", 0), m.get("mrr", 0), m.get("mttc")))
    return r


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="all")  # baseline | bge | all
    ap.add_argument("--weight", type=float, default=6.0)
    ap.add_argument("--window", type=int, default=40)
    args = ap.parse_args()

    print("=== available result keys probe ===")
    if args.mode in ("baseline", "all"):
        run(None, True, 0, 0, "baseline-rules")
    if args.mode in ("bge", "all"):
        rr = BGEReranker()
        if not rr.available:
            print("BGE unavailable; skipping"); sys.exit(0)
        # config A: buying-only gate (like current CE), config B: always-on
        run(rr, True, args.weight, args.window, f"bge-buyingonly-w{args.weight}")
        run(rr, False, args.weight, args.window, f"bge-alwayson-w{args.weight}")
