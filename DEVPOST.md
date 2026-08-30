# Devpost Submission Draft — Conversational Shopping Copilot

> Problem Statement 4: AI Conversational Search and Recommendations (TikTok TechJam 2026)

## TL;DR for judges

**Official public-set evaluator (unmodified), scored path uses the Python
standard library only — no network, no API keys, no GPU:**

| Hit Rate@10 | MRR | MTTC | Efficiency | **TechnicalScore** |
| ---: | ---: | ---: | ---: | ---: |
| 0.995 | 0.644 | 2.22 | 0.878 | **0.867** |

≈ **8.1×** the official BM25 starter TechnicalScore (0.10671). Deterministic across runs.

**Three differentiators**
1. **Explicit dialogue state machine with erase-and-rewrite intent override** —
   the superseded slot is removed, not appended (handles the hard 15% override
   scenarios; Override HR = 1.000).
2. **Recall proven saturated (200/200), then a banded popularity tiebreaker** —
   lifts the ranking tail without sacrificing precision (took TS 0.826 → 0.867;
   cross-validated as best on both split halves, so it generalizes).
3. **Two honest negative results kept as evidence** — a full local cross-encoder
   reranker that our lightweight rules beat, and a generalization-scope probe —
   demonstrating engineering judgment, not just a score.

**Reproduce in one command** (system Python, zero pip install):
```bash
git clone -b feature/aggressive-v2 https://github.com/Starryyu77/techjam-shopping-agent-v1.git
python evaluate_official.py --official-root <path-to-official-kit>   # -> TechnicalScore 0.867
```

## Inspiration

Real conversational commerce is a translation problem, not a search problem. A
shopper says "something comfortable for work, not too formal" and expects the
system to *understand* — track what they mean, ask the one question that matters,
and get the right product to the top fast. Industry evidence backs the payoff:
in a large-scale deployment (Alipay 618), moving users from passive
recommendation to active conversation lifted click-through ~3.7× and per-user
value ~2.1×. We set out to build that conversation engine under the challenge's
strict, realistic constraints.

## What it does

A multi-turn shopping agent that, over a frozen 50,000-product Amazon catalog:
- routes Buying vs Browsing intent and locks hard constraints early;
- maintains an explicit dialogue state machine (hard / soft / negative slots)
  and correctly handles mid-conversation **intent overrides** (erase & rewrite);
- retrieves with a hybrid FTS5 pipeline and transparent rule reranking;
- asks the single most discriminative clarifying question (coverage × entropy);
- returns a ranked top-10 with human-readable reasons — in ≤10 turns.

## How we built it

Pure Python standard library for the scored path — SQLite FTS5 for in-memory
recall over 50k products, a deterministic state machine, and a candidate-driven
question policy. Everything runs **offline on CPU**: no API keys, no network, no
paid model. Optional, disclosed dev layers (a localhost Qwen3-8B intent
classifier and a bundled cross-encoder reranker) exist for experiments but are
OFF for official scoring.

## Results

On the unmodified official public-set evaluator: **Hit Rate@10 = 0.995,
MRR = 0.644, MTTC = 2.215, TechnicalScore = 0.867** — versus the official weak
BM25 starter at 0.10671 (≈8.1× better by TechnicalScore). Recall is 100% saturated (target in pool for
200/200 sessions), so every gain came from smarter *ranking*: a banded
popularity tiebreaker that lifts the tail without sacrificing precision.

*The demo-layer features below (ad engine, LLM narration, TikTok theming) live
in a separate wrapper the evaluator never reaches; the scored path and these
numbers are unchanged and verified after every demo change.*

## What makes it different

1. **A design stance the problem statement rewards:** light-execution, offline,
   reproducible — not a compute arms race.
2. **A kept negative result:** we built a full local cross-encoder reranker and
   proved with data that carefully engineered rules beat it on this task's
   composite. We ship the rules and keep the experiment for transparency.
3. **Leakage-safe methodology:** dev/validation/held-out-test separation with a
   strict acceptance gate — prompts never see target ids or test labels.
4. **Transparent eCPM ad engine (demo):** a full sponsored-placement auction
   where winner = argmax(bid × BM25 relevance) — not highest-bid-wins. Ads
   below a relevance floor are suppressed; per-campaign budgets cap spend; and
   organic ranking is **never** altered. The ad economics (relevance%, eCPM$)
   are shown on every sponsored slot — auditable, not a black box.
5. **Conversational LLM sales-associate + TikTok content-to-commerce framing
   (demo):** a local Qwen3-8B (zero fine-tuning) rewrites deterministic
   recommendations into a natural 2–3 sentence sales pitch, naturally weaving
   in sponsored picks without fabricating facts. Themed as "TikTok Shop ·
   Shopping Copilot" with content-to-commerce sample flows (种草, browsing,
   buying). Motivated by the Alipay-618 finding that active conversational
   guidance lifts CTR ~3.7×.

## Challenges

Diagnosing the six public-set misses showed every one was a *ranking* problem,
not recall — the target was always retrievable but hard to lift above look-alikes
when the customer disclosed only a generic constraint like "cotton". That insight
reshaped our whole retrieval strategy.

## What's next

- Optional **BGE cross-encoder** for ad-relevance scoring (the model is
  downloaded; integrating it would replace BM25 relevance with dense semantic
  matching in the eCPM auction).
- **Second-price auction** (GSP) for fairer advertiser pricing.
- **Budget pacing and frequency capping** (per-session and per-day limits) to
  prevent ad fatigue.
- **Dense (vector) recall track** for open-ended Browsing queries where BM25
  keyword matching is weakest.
- Richer **user-profile personalization** (purchase-history weighting, style
  affinity) feeding both organic ranking and ad targeting.

## Built with

Python, SQLite FTS5 (scored path — stdlib only, no dependencies). Demo layer:
PyTorch, Hugging Face Transformers, Qwen3-8B (fp16, local inference, zero
fine-tuning), eCPM ad-auction engine with BM25 relevance scoring, and three
interactive dashboards (Shopper view, Ads Manager, Ads Dashboard) in vanilla
HTML/CSS/JS.

## Links

- **Code (public GitHub):** https://github.com/Starryyu77/techjam-shopping-agent-v1/tree/feature/aggressive-v2
- **Live judge-facing Tour:** https://shopping-copilot-techjam.pages.dev/
- **Demo video (YouTube):** <PASTE YOUTUBE URL AFTER UPLOAD — see demo/VIDEO_SCRIPT.md>
- **Try it offline:** `python demo/server.py --port 8000`, then open http://127.0.0.1:8000 for the Guided Evidence Tour; the optional legacy chat is at `/sandbox`.
- **Reproduce the score:** `python evaluate_official.py --official-root <official-kit>` → TechnicalScore ≈ 0.867 on the public set
