from __future__ import annotations
import sys, random
from pathlib import Path
OFFICIAL=Path("../techjam-conversational-search"); sys.path.insert(0,str(OFFICIAL)); sys.path.insert(0,".")
from evaluator.local_evaluator import catalog_index, intent_card, coarse_category
import shopping_agent as SA
from shopping_agent import _terms, _text
catalog=(OFFICIAL/"data"/"catalog.jsonl").resolve()
catalog_ids,categories,products=catalog_index(catalog)
cs=SA.CatalogSearch(str(catalog))
all_asins=list(products.keys()); rng=random.Random(20260830); rng.shuffle(all_asins)

def direct_recall(asin):
    card=intent_card(products[asin])
    vals=[]
    cat=coarse_category(categories.get(asin,[]))
    if cat: vals.append(cat)
    vals+= [str(x) for x in card.get("hard_constraints",[])]+[str(x) for x in card.get("soft_preferences",[])]
    terms=list(dict.fromkeys(_terms(" ".join(vals))))[:48]
    if not terms: return None,card,cat
    expr=" OR ".join('"'+t+'"' for t in terms)
    rows=cs.connection.execute("SELECT parent_asin FROM products WHERE products MATCH ? LIMIT ?",(expr,800)).fetchall()
    return asin in {str(r[0]) for r in rows}, card, cat

# check first 100 sampled products
recalled=0; not_recalled=0; examples=[]
for asin in all_asins[:150]:
    r,card,cat=direct_recall(asin)
    if r is None: continue
    if r: recalled+=1
    else:
        not_recalled+=1
        if len(examples)<6:
            title=(products[asin].get("title") or "")[:40]
            examples.append((asin,cat,card.get("hard_constraints",[])[:2],title))
cs.close()
print(f"direct recall on target's OWN card (150 random products): recalled={recalled} not_recalled={not_recalled}")
print("examples of NOT-recalled (degenerate cards):")
for e in examples: print("  ",e)
