from __future__ import annotations
import json, sys, time
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, coarse_category, materialize_hidden_fields
import shopping_agent as SA
import sqlite3, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

catalog_path=OFFICIAL/"data"/"catalog.jsonl"
catalog_ids,categories,products=catalog_index(catalog_path)
conn=sqlite3.connect(":memory:"); cur=conn.cursor()
cur.execute("CREATE VIRTUAL TABLE products USING fts5(parent_asin UNINDEXED,title,categories,features,details,store,description,tokenize='unicode61 remove_diacritics 2')")
with catalog_path.open() as h:
    b=[]
    for line in h:
        p=json.loads(line)
        b.append((str(p["parent_asin"]),SA._text(p.get("title")),SA._text(p.get("categories")),SA._text(p.get("features")),SA._text(p.get("details")),SA._text(p.get("store")),SA._text(p.get("description"))))
        if len(b)>=1000: cur.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?)",b); b.clear()
    if b: cur.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?)",b)
conn.commit()

dev="mps" if torch.backends.mps.is_available() else "cpu"
print("device:",dev)
tok=AutoTokenizer.from_pretrained("models/ms-marco-MiniLM-L-6-v2")
mdl=AutoModelForSequenceClassification.from_pretrained("models/ms-marco-MiniLM-L-6-v2").to(dev).eval()

def ce_scores(query, cand_ids):
    docs=[]
    for cid in cand_ids:
        p=products[cid]
        d=" ".join([str(p.get("title") or ""), SA._text(p.get("categories")), SA._text(p.get("features"))[:200]])
        docs.append(d[:400])
    scores=[]
    with torch.no_grad():
        for i in range(0,len(docs),64):
            batch_q=[query]*len(docs[i:i+64])
            enc=tok(batch_q, docs[i:i+64], padding=True, truncation=True, max_length=192, return_tensors="pt").to(dev)
            out=mdl(**enc).logits.squeeze(-1)
            scores.extend(out.tolist())
    return scores

MISSES={"public_0020":"B08P4SSFX4","public_0037":"B08KKBBMMD","public_0087":"B0BT158RRR","public_0144":"B08LMMDYV7","public_0161":"B0B6N6TJ6V","public_0175":"B07D5M61T2"}
samples={s["sample_id"]:s for s in (json.loads(l) for l in (OFFICIAL/"data"/"public_set.jsonl").open() if l.strip())}

# warm up
_=ce_scores("test", list(products.keys())[:10])
t0=time.time()
POOL=800; RERANK_N=800
for sid,tgt in MISSES.items():
    sample=samples[sid]
    card,beh=materialize_hidden_fields(sample,products)
    cc=coarse_category(categories.get(tgt,[]))
    hard=" ".join(str(x) for x in card.get("hard_constraints",[]))
    query=f"{cc} {hard}".strip()
    terms=list(dict.fromkeys(SA._terms(cc+" cotton")))
    expr=" OR ".join(f'"{t}"' for t in terms)
    rows=conn.execute(f"SELECT parent_asin FROM products WHERE products MATCH ? ORDER BY bm25(products,0.0,6.0,4.0,3.0,2.0,2.0,1.0) LIMIT {POOL}",(expr,)).fetchall()
    ids=[r[0] for r in rows]
    scores=ce_scores(query, ids)
    # Fusion: normalize CE score to rank, combine with BM25 rank via RRF
    ce_order=sorted(range(len(ids)), key=lambda i:scores[i], reverse=True)
    ce_rank_of={ids[ce_order[r]]:r+1 for r in range(len(ce_order))}
    bm25_rank_of={ids[r]:r+1 for r in range(len(ids))}
    K=60
    rrf={cid: 1.0/(K+bm25_rank_of[cid]) + 1.0/(K+ce_rank_of[cid]) for cid in ids}
    fused=sorted(ids, key=lambda c:rrf[c], reverse=True)
    print(f"{sid}: bm25={bm25_rank_of.get(tgt)} ce={ce_rank_of.get(tgt)} rrf={fused.index(tgt)+1 if tgt in fused else None}")
print(f"\n6 sessions, {dev}, pool={POOL}: {time.time()-t0:.1f}s -> per-session {(time.time()-t0)/6:.2f}s")
