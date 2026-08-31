# Demo Video Script — Shopping Copilot Evidence Tour (≤3 min)

Record the Guided Evidence Tour, not the legacy chat sandbox. The Tour uses
frozen official-public evidence and does not call a live LLM.

> Public-set result: HitRate@10 0.995 · MRR 0.644355 · MTTC 2.215 ·
> TechnicalScore 0.866507. The official weak BM25 starter TechnicalScore is
> 0.10671, so the submitted path is about 8.1× higher on the public set.

## Open the Tour

- Public: https://shopping-copilot-techjam.pages.dev/
- Local: `python demo/server.py --port 8000`, then open `http://127.0.0.1:8000`
- Recording viewport: 1440×900

Do not open `/sandbox`, Ads Manager, or the legacy dashboard in the main video.
Do not describe public-set results as hidden-set or final competition results.

## Shot list

### 0:00–0:20 — Result hook

- Show the Hero: TechnicalScore 0.8665, HitRate@10 0.995, MRR 0.644, MTTC 2.215.
- Point out `Official public evaluator · 200 sessions` and the amber
  `Private 800-session performance remains unknown` boundary.

Suggested narration:

> “Shopping Copilot finds the purchased product earlier and ranks it higher over
> a frozen 50,000-product catalog, in at most ten turns. The submitted path runs
> fully offline on CPU with no API keys.”

### 0:20–0:45 — Competition data contract

- Click `Start 3-minute evidence tour`.
- Show Amazon Reviews 2023, 50,000 frozen products, 200 public / 800 private,
  `parent_asin`, read-only catalog, and the scenario mix.

> “The website is not a synthetic product mock. Every replay comes from the
> labeled official public split, and the private 800-session result remains unknown.”

### 0:45–1:10 — Buying case

- Open Replay → Buying.
- Keep `public_0018` selected.
- Advance Turn 1 → Turn 3 and point to the rank journey:
  `Outside Top-10 → Outside Top-10 → Rank #1`.
- Point to `8 new · 2 retained · 2 reordered` and the `NEW` badges.

> “The first request is not enough: the purchased item is outside Top-10. After
> the user's material answer, eight recommendations change and the target moves
> directly to Rank #1.”

### 1:10–1:40 — Intent Override

- Select `Intent Override`.
- Keep `public_0003` selected and use Auto to advance Turn 1 → Turn 5.
- Point to the Turn 3 removal of `material: stainless steel`, then the Turn 5
  `9 new · 1 retained · Rank #1` result.
- Briefly point to `public_0046` for the `Preview #5 → Preview #1 → Scored #1`
  distinction and `public_0142` for multi-slot rewrite.

> “The difficult override scenario is erase-and-rewrite, not append-only state.
> The superseded preference disappears, the agent keeps asking useful questions,
> and the final answer changes nine recommendations before the target reaches #1.”

### 1:40–2:05 — Mechanism

- Open Mechanism after the Buying target reaches Rank #1; the context bar should
  remain on `public_0018 · Turn 3 / 3`.
- Click `Versioned State` to show the added material values.
- Click `Rule Reranker` to show the new Top-3 and score anatomy:
  category +3, hard +4, soft +1.5, and popularity as tie-break only.
- Point to `Question Policy` without opening the negative-results drawer.

> “This is the shipped data path, not a conceptual architecture diagram. The
> selected user answer updates state, FTS5 recalls candidates, transparent rules
> rerank them, and the question policy asks only when candidates remain ambiguous.”

### 2:05–2:35 — Evaluation evidence

- Open Evaluation.
- Show the official starter row: 0.125 / 0.068 / 9.810 / 0.1067.
- Show Rules V1.3: 0.995 / 0.644 / 2.215 / 0.8665.
- Show the per-scenario table and report hash.

> “On the unmodified public evaluator, TechnicalScore rises from 0.10671 to
> 0.866507, about 8.1 times the starter. The result is reproducible, but still
> public-set evidence only.”

### 2:35–2:50 — Demo-only ad extension

- Open Ads and click `Run Auction`.
- Show the purple Demo Only boundary, relevance floor, before/after organic ASIN
  lists, and the verified ordering invariant.

> “This is a separate commercial extension. It is never called by the evaluator
> and cannot alter the organic Top-10 order.”

### 2:50–3:00 — Close

- Open Close.
- End on the repository, technical report, reproduction instructions, and the
  private-800 limitation.

## Overlay captions

- `Official public evaluator · N=200`
- `Offline · CPU-only · Python stdlib · no API keys`
- `Intent Override: erase and rewrite`
- `TechnicalScore 0.10671 → 0.866507`
- `Public-set evidence; private 800 unknown`
- `Demo-only ads; organic ordering unchanged`
