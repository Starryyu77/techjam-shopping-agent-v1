# Devpost Submission Draft — Conversational Shopping Copilot

> Problem Statement 4: AI Conversational Search and Recommendations (TikTok TechJam 2026)

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

On the unmodified official public-set evaluator: **Hit Rate@10 = 0.970,
MRR = 0.613, MTTC = 3.155, TechnicalScore = 0.826** — versus the official weak
BM25 baseline at 0.139 (≈6× better).

## What makes it different

1. **A design stance the problem statement rewards:** light-execution, offline,
   reproducible — not a compute arms race.
2. **A kept negative result:** we built a full local cross-encoder reranker and
   proved with data that carefully engineered rules beat it on this task's
   composite. We ship the rules and keep the experiment for transparency.
3. **Leakage-safe methodology:** dev/validation/held-out-test separation with a
   strict acceptance gate — prompts never see target ids or test labels.

## Challenges

Diagnosing the six public-set misses showed every one was a *ranking* problem,
not recall — the target was always retrievable but hard to lift above look-alikes
when the customer disclosed only a generic constraint like "cotton". That insight
reshaped our whole retrieval strategy.

## What's next

Dual-track dense recall for open-ended Browsing, a self-evolving prompt-iteration
loop with rule+LLM dual scoring, and an interactive state-visualization demo.

## Built with

Python, SQLite FTS5. (Optional/dev: PyTorch, Transformers, llama.cpp, Qwen3-8B.)
