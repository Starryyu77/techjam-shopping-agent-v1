"""P3b: conservative question-policy variants to capture MTTC gain WITHOUT losing HR."""
import sys, os, math, argparse
from collections import Counter
sys.path.insert(0, "agent"); sys.path.insert(0, ".")
os.environ["TECHJAM_CATALOG"] = "data/catalog.jsonl"
from evaluator.local_evaluator import catalog_index, load_jsonl
from evaluator import local_evaluator as EV
from official_agent import Agent as OfficialAgent
import shopping_agent as SA

_orig = SA.CandidateQuestionPolicy.choose

def make_choose(mode):
    def choose(self, state, candidates):
        if state.category is None:
            state.asked_attributes.add("category"); state.last_question="category"; return "category"
        if not candidates:
            if "other" in state.asked_attributes:
                state.last_question=None; return None
            state.asked_attributes.add("other"); state.last_question="other"; return "other"
        known=set(state.no_preference); known.update(state.hard_constraints)
        known.update(state.soft_preferences); known.update(state.negative_constraints)
        npool=len(candidates)
        best=None
        for order, attribute in enumerate(SA.QUESTION_ATTRIBUTES):
            if attribute in known or attribute in state.asked_attributes: continue
            values=[self._candidate_value(c, attribute) for c in candidates]
            observed=[v for v in values if v is not None]
            if not observed: continue
            coverage=len(observed)/npool
            counts=Counter(observed)
            if coverage<0.30 or len(counts)<2: continue
            if attribute=="brand" and max(counts.values())/npool<0.15: continue
            entropy=-sum((c/len(observed))*math.log(c/len(observed)) for c in counts.values())/math.log(len(counts))
            value=coverage*entropy
            # --- variants ---
            if mode=="demote_size_tiebreak":
                # keep raw value; only demote size in the tie-order (prefer other attrs when close)
                penalty = 0 if attribute!="size" else 1
                cs=(round(value,4), -penalty, -order, attribute)
            elif mode=="skip_size_when_focused":
                # only down-weight size when pool already small (target likely near top): low risk
                w = 1.0
                if attribute=="size" and npool <= 200:  # recall_pool default 800; small=focused
                    w = 0.4
                value *= w
                cs=(value, -order, attribute)
            elif mode=="demote_size_soft":
                w = 0.55 if attribute=="size" else 1.0
                value *= w
                cs=(value, -order, attribute)
            else:
                cs=(value, -order, attribute)
            if best is None or cs>best: best=cs
        if best is None or best[0]<0.15:
            state.last_question=None; return None
        attr=best[-1]; state.asked_attributes.add(attr); state.last_question=attr; return attr
    return choose

def run(mode):
    SA.CandidateQuestionPolicy.choose = _orig if mode=="baseline" else make_choose(mode)
    samples=load_jsonl("data/public_set.jsonl"); ci,cat,prod=catalog_index("data/catalog.jsonl")
    a=OfficialAgent(); r=EV.evaluate(a,samples,ci,cat,prod)
    try: a.close()
    except Exception: pass
    sm=r.get("scenario_metrics",{})
    print("[%s] TS=%.4f HR=%.4f MRR=%.4f MTTC=%.3f" % (mode,
        r["recommended_technical_score"], r["hit_rate_at_10"], r["mrr"], r["mttc"]))
    for k in sorted(sm):
        print("   %-16s HR=%.3f MRR=%.3f MTTC=%s" % (k, sm[k].get("hit_rate_at_10",0), sm[k].get("mrr",0), sm[k].get("mttc")))

if __name__=="__main__":
    for m in ["baseline","demote_size_tiebreak","skip_size_when_focused","demote_size_soft"]:
        run(m)
