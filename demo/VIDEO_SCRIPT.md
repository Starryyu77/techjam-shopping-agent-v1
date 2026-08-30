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
- Show canonical case `public_0030`.
- Highlight `+ added material: polyester` and Target Rank #1.

> “A concrete Buying request locks the explicit material constraint immediately,
> retrieves ten catalog-valid products, and places the target first.”

### 1:10–1:40 — Intent Override

- Select `Intent Override`.
- Advance `public_0004` from Turn 1 to Turn 3.
- Point to `removed feature: adjustable`, `added material: polyester`, and Rank #1.

> “The difficult override scenario is erase-and-rewrite, not append-only state.
> The superseded preference disappears while the replacement enters the state.”

### 1:40–2:05 — Mechanism

- Open Mechanism.
- Briefly cover intent routing, versioned state, FTS5 retrieval, rule reranking,
  candidate-driven clarification, and the banded popularity tiebreaker.
- Open `Experiments We Did Not Ship` to show the cross-encoder negative result.

> “We built heavier alternatives, measured them, and kept the lightweight path
> because it scored better on this task.”

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
