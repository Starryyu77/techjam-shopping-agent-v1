"""Confirm the +5.0 is purely the trailing-newline sensitivity."""
import sys, json
sys.path.insert(0,"exp/selfevolve"); sys.path.insert(0,"agent"); sys.path.insert(0,".")
import self_evolve as SE
seed=open("agent/prompts/system_prompt_v001.md").read()
r1=json.load(open("exp/selfevolve/rounds/round_1.json"))["prompt"]
print("seed endswith newline:", repr(seed[-3:]), "| r1 endswith:", repr(r1[-3:]), flush=True)
variants = [
  ("seed_as_is", seed),
  ("seed_stripped", seed.rstrip()),
  ("r1_as_is", r1),
  ("r1_plus_nl", r1+"\n"),
]
for nm,p in variants:
    te,_=SE.evaluate(p,"test"); print("%-16s test=%.1f (len=%d)"%(nm,te,len(p)), flush=True)
print("NL_DONE", flush=True)
