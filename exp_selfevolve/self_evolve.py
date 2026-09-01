"""Self-evolving system-prompt optimizer for the intent parser.
Mirrors the WeChat-article method: dual-track scoring, train/test split to fight
overfitting, badcase confusion signals (train vs test), and a rewriter constrained
by four anti-overfit rules. Optimizes ONLY the intent-layer system prompt; it does
NOT touch the scoring path (which stays pure rules)."""
import sys, os, json, re, time, argparse, urllib.request
sys.path.insert(0, os.path.expanduser("~/shopagent/agent"))
sys.path.insert(0, os.path.expanduser("~/shopagent"))

CASES = json.load(open(os.path.expanduser("~/shopagent/exp/selfevolve/golden_cases.json")))
ENDPOINT = "http://127.0.0.1:8100/v1/chat/completions"
SCHEMA_PATH = None  # use agent's INTENT_RESPONSE_SCHEMA

from shopping_copilot import shopping_agent as SA
from shopping_copilot.shopping_agent import ShoppingState, INTENT_RESPONSE_SCHEMA, DOMAIN_INTENTS, DIALOGUE_ACTS

def llm_chat(messages, schema=None, max_tokens=320):
    body={"messages":messages,"max_tokens":max_tokens}
    if schema is not None: body["response_schema"]=schema
    req=urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(),
        headers={"Content-Type":"application/json"})
    r=json.load(urllib.request.urlopen(req, timeout=60))
    return r["choices"][0]["message"]["content"], r.get("usage",{})

def parse_intent(system_prompt, case):
    """Run one case through the LLM intent parser, return predicted dict."""
    state=ShoppingState()
    st=case.get("state") or {}
    if case.get("last_q"): state.last_question=case["last_q"]
    if st.get("category"): state.category=st["category"]
    if st.get("last_question"): state.last_question=st["last_question"]
    if st.get("hard_constraints"): state.hard_constraints=dict(st["hard_constraints"])
    if st.get("soft_preferences"): state.soft_preferences=dict(st["soft_preferences"])
    if st.get("last_recommendations"): state.last_recommendations=list(st["last_recommendations"])
    payload={"current_state":state.prompt_view(),"user_message":case["msg"]}
    content,_=llm_chat(
        [{"role":"system","content":system_prompt+"\n/no_think"},
         {"role":"user","content":json.dumps(payload,ensure_ascii=False)}],
        schema=INTENT_RESPONSE_SCHEMA)
    # extract JSON
    m=re.search(r"\{.*\}", content, re.DOTALL)
    if not m: return None, content
    try: return json.loads(m.group(0)), content
    except Exception: return None, content

# dialogue_act equivalence classes: acts that lead to the SAME downstream state change
# are treated as acceptable variants (mirrors the article: what matters is downstream routing).
DA_EQUIV = [
    {"NEW", "ADD", "ANSWER"},   # all add/refine constraints into the current goal
    {"REJECT", "NEGATE"},       # both express rejection of shown/constraint
]
def _da_equiv(pred_da, exp_da):
    if pred_da == exp_da: return True
    for grp in DA_EQUIV:
        if pred_da in grp and exp_da in grp: return True
    return False

def score_case(pred, case):
    """Dual-track scoring. domain_intent is PRIMARY (routes downstream: item vs benefit
    vs irrelevant). dialogue_act uses equivalence classes so semantically-equal acts do
    not create false badcases. Structural validity guards BENEFIT/IRRELEVANT purity."""
    if pred is None: return 0.0, "no_json"
    di_ok = pred.get("domain_intent")==case["di"]
    da_ok = _da_equiv(pred.get("dialogue_act"), case["da"])
    struct_ok = True
    if case["di"] in ("BENEFIT","IRRELEVANT"):
        struct_ok = (pred.get("dialogue_act")=="NOOP" and not pred.get("constraints"))
    valid = pred.get("domain_intent") in DOMAIN_INTENTS and pred.get("dialogue_act") in DIALOGUE_ACTS
    s = 0.6*di_ok + 0.2*da_ok + 0.2*(struct_ok and valid)
    tag = "%s/%s exp %s/%s%s" % (pred.get("domain_intent"),pred.get("dialogue_act"),
        case["di"],case["da"], "" if di_ok else " DI-MISS")
    return s, tag

def evaluate(system_prompt, split):
    rows=[]; total=0
    for c in CASES[split]:
        pred,_=parse_intent(system_prompt,c)
        s,tag=score_case(pred,c)
        total+=s
        rows.append((c["name"],s,tag,c["di"],c["da"], (pred or {}).get("domain_intent"),(pred or {}).get("dialogue_act")))
    return 100*total/len(CASES[split]), rows

def confusion(train_rows, test_rows):
    from collections import Counter
    def conf(rows):
        c=Counter()
        for name,s,tag,edi,eda,pdi,pda in rows:
            if pdi != edi: c["%s->%s"%(edi,pdi or "None")]+=1   # only domain_intent errors
        return c
    ct=conf(train_rows); cte=conf(test_rows)
    lines=[]
    for k in sorted(set(ct)|set(cte), key=lambda x:-(ct[x]+cte[x])):
        tr=ct[k]; te=cte[k]
        sig = "两端共现·真实缺口" if tr and te else ("仅训练集·疑似噪声" if tr else "仅测试集·泛化不足")
        lines.append("%s: train %d / test %d 【%s】"%(k,tr,te,sig))
    return "\n".join(lines) if lines else "(no confusion)"

REWRITER_RULES = '''你是提示词优化器。基于训练集 badcase 改进意图识别 system prompt。严格遵守四条反过拟合规则:
1. 案例服务于规则: 从多个 badcase 抽象出共同判定规则/边界条件写进规则区, 严禁堆砌 few-shot 或"例如X输出Y"式枚举来刷分。
2. 新增案例硬上限: 每条规则本轮最多新增1条示意性案例, 且只用于说明边界或反例, 不用于穷举。
3. 区分 train/test 信号: 两端共现=真实规则缺口(优先抽象成规则); 仅测试集=泛化不足(往判定原理改); 仅训练集=疑似噪声(禁止为它单独加规则)。
4. 已达标维度原样不动, 只改不满足的维度。
只输出改进后的完整 system prompt 正文, 不要解释, 不要 markdown 代码块围栏。'''

def rewrite(system_prompt, train_rows, conf_text):
    bad=[r for r in train_rows if r[1]<0.99]
    badlist="\n".join("- %s: 期望 %s/%s, 实际 %s/%s"%(n,edi,eda,pdi,pda) for n,s,tag,edi,eda,pdi,pda in bad)
    msg=("当前 system prompt:\n<<<\n%s\n>>>\n\n训练集 badcase:\n%s\n\n意图混淆模式(expected->actual):\n%s\n\n请输出改进后的完整 system prompt。"
         %(system_prompt,badlist or "(none)",conf_text))
    content,_=llm_chat([{"role":"system","content":REWRITER_RULES},{"role":"user","content":msg}],max_tokens=2048)
    # guard against truncated rewrites: if the rewrite dropped the constraint-rules section
    # or is materially shorter than the input, keep the original prompt (safety > risky rewrite).
    if len(content) < 0.85*len(system_prompt) or "Constraint rules" not in content or "Output exactly" not in content:
        return system_prompt
    # strip code fences if any
    content=re.sub(r"^\s*```[a-z]*\n","",content); content=re.sub(r"\n```\s*$","",content)
    return content.strip()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--rounds",type=int,default=6)
    ap.add_argument("--train_thresh",type=float,default=90)
    ap.add_argument("--test_thresh",type=float,default=92)
    ap.add_argument("--seed_prompt",default=os.path.expanduser("~/shopagent/agent/prompts/system_prompt_v001.md"))
    a=ap.parse_args()
    outdir=os.path.expanduser("~/shopagent/exp/selfevolve/rounds"); os.makedirs(outdir,exist_ok=True)
    prompt=open(a.seed_prompt).read()
    best=None
    for rnd in range(a.rounds):
        tr_score,tr_rows=evaluate(prompt,"train")
        te_score,te_rows=evaluate(prompt,"test")
        conf_text=confusion(tr_rows,te_rows)
        overfit = tr_score - te_score > 8
        print("[round %d] train=%.1f test=%.1f %s"%(rnd,tr_score,te_score,"[OVERFIT?]" if overfit else ""),flush=True)
        print(conf_text,flush=True)
        json.dump({"round":rnd,"train":tr_score,"test":te_score,"prompt":prompt,"confusion":conf_text},
                  open(os.path.join(outdir,"round_%d.json"%rnd),"w"),ensure_ascii=False,indent=2)
        if best is None or te_score>best[1]: best=(prompt,te_score,tr_score,rnd)
        if tr_score>=a.train_thresh and te_score>=a.test_thresh:
            print("CONVERGED at round %d"%rnd,flush=True); break
        prompt=rewrite(prompt,tr_rows,conf_text)
    print("BEST test=%.1f train=%.1f (round %d)"%(best[1],best[2],best[3]),flush=True)
    open(os.path.join(outdir,"best_prompt.md"),"w").write(best[0])
    print("SELFEVOLVE_DONE",flush=True)

if __name__=="__main__": main()
