"""P3: question-policy ablation. Test whether de-prioritizing low-relevance
high-entropy attributes (esp. size) improves MTTC without hurting HR/MRR."""
import sys, os, json, argparse
sys.path.insert(0, "agent"); sys.path.insert(0, ".")
os.environ["TECHJAM_CATALOG"] = "data/catalog.jsonl"
from evaluator.local_evaluator import catalog_index, load_jsonl
from evaluator import local_evaluator as EV
from shopping_copilot.official_agent import Agent as OfficialAgent
from shopping_copilot import shopping_agent as SA

def patch_policy(mode):
    """Return a monkey-patched choose() based on mode."""
    Policy = SA.CandidateQuestionPolicy
    orig_choose = Policy.choose
    if mode == "baseline":
        Policy.choose = orig_choose
        return
    import math
    from collections import Counter
    def choose(self, state, candidates):
        if state.category is None:
            state.asked_attributes.add("category"); state.last_question="category"; return "category"
        if not candidates:
            if "other" in state.asked_attributes:
                state.last_question=None; return None
            state.asked_attributes.add("other"); state.last_question="other"; return "other"
        known=set(state.no_preference); known.update(state.hard_constraints)
        known.update(state.soft_preferences); known.update(state.negative_constraints)
        best=None
        # per-attribute relevance prior: down-weight attributes that rarely disambiguate the TARGET
        # (size/color are size/variant-level, not parent-level). Data-driven from P3 diagnostic.
        PRIOR = {"size":0.35,"color":0.6} if mode in ("downweight","downweight_strong") else {}
        if mode=="downweight_strong": PRIOR={"size":0.15,"color":0.5,"brand":0.7}
        for order, attribute in enumerate(SA.QUESTION_ATTRIBUTES):
            if attribute in known or attribute in state.asked_attributes: continue
            values=[self._candidate_value(c, attribute) for c in candidates]
            observed=[v for v in values if v is not None]
            if not observed: continue
            coverage=len(observed)/len(candidates)
            counts=Counter(observed)
            if coverage<0.30 or len(counts)<2: continue
            if attribute=="brand" and max(counts.values())/len(candidates)<0.15: continue
            entropy=-sum((c/len(observed))*math.log(c/len(observed)) for c in counts.values())/math.log(len(counts))
            value=coverage*entropy*PRIOR.get(attribute,1.0)
            cs=(value,-order,attribute)
            if best is None or cs>best: best=cs
        if best is None or best[0]<0.15:
            state.last_question=None; return None
        attr=best[2]; state.asked_attributes.add(attr); state.last_question=attr; return attr
    Policy.choose = choose

def run(mode):
    patch_policy(mode)
    samples=load_jsonl("data/public_set.jsonl")
    ci,cat,prod=catalog_index("data/catalog.jsonl")
    a=OfficialAgent(); r=EV.evaluate(a,samples,ci,cat,prod)
    try: a.close()
    except Exception: pass
    sm=r.get("scenario_metrics",{})
    print("[%s] TS=%.4f HR=%.4f MRR=%.4f MTTC=%.3f" % (mode,
        r["recommended_technical_score"], r["hit_rate_at_10"], r["mrr"], r["mttc"]))
    for k in sorted(sm):
        print("   %-16s HR=%.3f MRR=%.3f MTTC=%s" % (k, sm[k].get("hit_rate_at_10",0), sm[k].get("mrr",0), sm[k].get("mttc")))

if __name__=="__main__":
    for m in ["baseline","downweight","downweight_strong"]:
        run(m)
