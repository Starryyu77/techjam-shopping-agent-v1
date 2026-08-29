from __future__ import annotations
import json, sys
from pathlib import Path
OFFICIAL = Path("../techjam-conversational-search"); sys.path.insert(0, str(OFFICIAL)); sys.path.insert(0, ".")
from evaluator.local_evaluator import catalog_index
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
catalog_ids,categories,products=catalog_index(catalog)
# targets and their above-ranked distractors from the analysis
cases={
 "0083":("B0B8J3X7P8","B08SS3KDSQ","B0BD926PGR"),  # top3 (target was rank 11)
 "0161":("B0C1YPPMQ1","B07VV1RV62","B08GLZJPL7"),
 "0174":("B00F4O2QC2","B00O3BRNXY","B079JGHJN3"),
 "0194":("B07SN26M1D","B07SKMNYGK","B01GR9L2FY"),
}
targets={"0083":None,"0161":None,"0174":None,"0194":None}
# get targets from public set
samples=[json.loads(l) for l in open(OFFICIAL/"data"/"public_set.jsonl")]
byid={s["sample_id"]:s for s in samples}
for k in cases: targets[k]=byid["public_"+k]["ground_truth"]["parent_asin"]

def info(asin):
    p=products.get(asin,{})
    return {"rating":p.get("average_rating"),"n":p.get("rating_number"),"price":p.get("price"),"title":(p.get("title") or "")[:35]}
for k,tops in cases.items():
    t=targets[k]
    print(f"--- public_{k} target={t}")
    print(f"  TARGET : {info(t)}")
    for a in tops:
        print(f"  above  : {a} {info(a)}")
