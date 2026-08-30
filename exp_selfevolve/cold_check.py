"""Cold-score seed vs r1 prompt each in this single process but reset any model state between."""
import sys, json
sys.path.insert(0,"exp/selfevolve"); sys.path.insert(0,"agent"); sys.path.insert(0,".")
import self_evolve as SE
seed=open("agent/prompts/system_prompt_v001.md").read()
r1=json.load(open("exp/selfevolve/rounds/round_1.json"))["prompt"]
# Score in BOTH orders to expose any evaluation-order/caching artifact.
print("--- order A: seed then r1 ---", flush=True)
for nm,p in [("seed",seed),("r1",r1)]:
    te,_=SE.evaluate(p,"test"); print("%s test=%.1f"%(nm,te), flush=True)
print("--- order B: r1 then seed ---", flush=True)
for nm,p in [("r1",r1),("seed",seed)]:
    te,_=SE.evaluate(p,"test"); print("%s test=%.1f"%(nm,te), flush=True)
print("COLD_DONE", flush=True)
