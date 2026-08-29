from __future__ import annotations
import json, sys
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, coarse_category
import shopping_agent as SA
import sqlite3
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

MISSES={"public_0020":"B08P4SSFX4","public_0037":"B08KKBBMMD","public_0087":"B0BT158RRR","public_0144":"B08LMMDYV7","public_0161":"B0B6N6TJ6V","public_0175":"B07D5M61T2"}
for pool_size in [300, 600, 1000, 2000]:
    print(f"=== pool={pool_size} ===")
    for sid,tgt in MISSES.items():
        cc=coarse_category(categories.get(tgt,[]))
        terms=list(dict.fromkeys(SA._terms(cc+" cotton")))
        expr=" OR ".join(f'"{t}"' for t in terms)
        rows=conn.execute(f"SELECT parent_asin FROM products WHERE products MATCH ? ORDER BY bm25(products,0.0,6.0,4.0,3.0,2.0,2.0,1.0) LIMIT {pool_size}",(expr,)).fetchall()
        ids=[r[0] for r in rows]
        r=ids.index(tgt)+1 if tgt in ids else None
        print(f"  {sid}: recalled={tgt in ids}, rank={r}")
