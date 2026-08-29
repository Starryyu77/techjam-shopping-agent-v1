# Demo Video Script — Conversational Shopping Copilot (≤3 min)

Backend track: a walkthrough of the working agent + live state visualization +
evaluation dashboard. Fully offline, CPU-only, no API keys.

## Setup before recording
```bash
export TECHJAM_CATALOG=/path/to/techjam-conversational-search/data/catalog.jsonl
python demo/server.py --port 8000          # loads 50k catalog into in-memory FTS5
# open http://127.0.0.1:8000  (and /dashboard in a second tab)
```

## Shot list

### 0:00–0:20 — Hook + framing
- On screen: the demo homepage.
- VO: "Real conversational commerce is a translation problem. A shopper speaks
  naturally; the agent must track intent, ask the one question that matters, and
  surface the right product fast — in ten turns, over a frozen 50,000-product
  catalog. Here's ours, running fully offline on CPU, no API keys."

### 0:20–1:05 — Buying track + live state machine
- Type: "I'm looking for running shoes, must be breathable"
- Point to the RIGHT panel: intent flips to BUYING; hard constraints light up
  (use_case: running, feature: breathable); category = running shoes; candidate
  pool and turn counter update; top-10 recommendations render with titles.
- VO: "Every internal slot is visible. This isn't a black box — it's an explicit
  dialogue state machine. It asks the single most discriminative question by
  candidate coverage times entropy, not a fixed script."
- Type: "not cotton, budget under 80 dollars"
- Point: negative constraint (material: cotton) appears; budget hard constraint
  added; candidates re-rank.

### 1:05–1:45 — Intent override (the hard 15%)
- Type: "Actually, ignore my earlier preference. I need waterproof."
- Point: "breathable" is ERASED from hard constraints (not appended);
  "waterproof" enters as a soft preference; recommendations pivot to waterproof
  products live.
- VO: "Mid-conversation intent override — the scenario that breaks naive
  append-only agents. We erase and rewrite the superseded slot, exactly what the
  evaluator tests on turns three and four."

### 1:45–2:30 — Evaluation dashboard (rigor)
- Switch to /dashboard tab.
- Point: TechnicalScore 0.826 on the unmodified official public evaluator,
  ~6× the official BM25 baseline (0.139). Per-scenario breakdown. Rank
  distribution.
- VO: "On the official evaluator: Hit Rate 0.97, MRR 0.61, Technical Score 0.83.
  We also built a full local cross-encoder reranker — and the data said our
  lightweight rules beat it on the composite. We kept the rules and kept the
  experiment. That's the light-execution outcome this problem rewards."

### 2:30–3:00 — Methodology + close
- Point to the methodology card: leakage-safe prompt self-evolution
  (dev-only bad cases, validation acceptance gate, held-out test read once).
- VO: "Offline, reproducible, and honest about what works. Everything you saw
  runs from the standard library with no network. Thanks for watching."

## On-screen captions to overlay
- "Offline · CPU-only · no API keys"
- "Explicit dialogue state machine"
- "Intent override: erase & rewrite"
- "Official evaluator · TechnicalScore 0.826 · ~6× baseline"
- "We shipped rules; we kept the cross-encoder as evidence"
