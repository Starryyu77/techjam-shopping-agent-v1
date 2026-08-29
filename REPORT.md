# Technical Report — Conversational Shopping Agent (TechJam 2026, PS4)

## 1. Objective and approach

We build a multi-turn shopping agent that, over a frozen 50,000-product Amazon
Reviews 2023 (Clothing, Shoes & Jewelry) catalog, finds a hidden target product
as early and as highly ranked as possible within ten turns. The evaluator drives
a simulated customer from a hidden intent card; only exact `parent_asin` matches
count as hits.

Our thesis is a deliberate design stance rather than a compute stance: **the
problem statement is engineered to reward light-execution systems** (it forbids
full-parameter fine-tuning, mandates in-memory execution, states a paid LLM is
not required, and may disable network access at final scoring). We therefore
optimize for a fully offline, CPU-only, deterministic pipeline and treat every
learned component as an *optional, evidence-gated* enhancement.

## 2. Architecture

```
user message
  → intent + dialogue-act parsing (rules; optional localhost Qwen for vague intent)
  → dialogue state machine  (hard / soft / negative slots; intent-override rewrite)
  → hybrid retrieval        (SQLite FTS5 recall → rule rerank; optional CE / dense)
  → question policy          (coverage × entropy: ask the most discriminative attribute)
  → {message, ask_attribute, recommendations[10], usage}
```

### 2.1 Dual-track intent routing (Pillar I)
Concrete "Buying" messages disclose a hard constraint early; we lock it as a hard
slot and bias retrieval toward exact constraint satisfaction. Open-ended
"Browsing" starts vague; we withhold premature filtering and instead ask a
discriminative clarifying question. Routing is rule-first for precision, with an
optional localhost Qwen3-8B layer that only activates when rule confidence is low
(hybrid mode) and can never overwrite a confident rule state.

### 2.2 Dialogue state machine (Pillar II)
State is explicit and inspectable: per-attribute **hard** constraints, **soft**
preferences, **negative** constraints, rejected asins, and raw retrieval
evidence. Dialogue acts (NEW/ANSWER/ADD/NEGATE/OVERRIDE/NO_PREFERENCE/SELECT/
REJECT/STOP/RESET/NOOP) drive incremental slot updates. **Intent Override**
(15% of sessions) is handled by erasing the superseded soft preference and
rewriting the slot, not by appending — the exact behavior the evaluator tests on
turns 3–4.

### 2.3 Hybrid retrieval and ranking (Pillar I)
FTS5 recalls up to 800 candidates via a BM25-weighted MATCH over
title/categories/features/details/store/description. A transparent rerank then
adds hard-constraint bonuses, soft-preference bonuses, negative-constraint
filtering, retrieval-evidence bonuses, a safe-profile preference-tag nudge, and a
small rating prior. English matching is word-boundary aware (no "ring" inside
"exploring", no "red" inside "preferred").

### 2.4 Adaptive clarification (Pillar III)
The question policy scores each unasked attribute by candidate **coverage ×
entropy** and asks the single most discriminative one, avoiding mechanical
fixed-order questioning. It stops asking when candidates are already focused or a
question would add no information, directly improving MTTC (efficiency).

### 2.5 Safe personalization (Pillar III)
The anonymized `user_profile` (purchase_frequency, rating_style,
preference_tags, summary) is used only as a soft signal — preference tags nudge
both query expansion and rerank scoring — never as a hard filter, respecting the
"controlled preference tags" contract.

## 3. Models, cost, latency

- **Scored default:** rules + SQLite FTS5. **No model, no network, no API key.**
  Token usage reported to the evaluator is 0/0. Per-turn latency is dominated by
  the FTS5 query and is well under a second on CPU; the 50k index builds in
  memory at startup.
- **Optional dev layers (OFF for scoring, disclosed for transparency):**
  - Localhost Qwen3-8B (Q4_K_M, llama.cpp) for vague-intent classification in
    hybrid/model mode. Endpoint restricted to loopback; ~5.8 GB VRAM,
    ~38–42 tok/s on an RTX 4060 Laptop. Approximate cost: $0 (local).
  - A bundled MiniLM cross-encoder reranker (~88 MB) for semantic reranking
    experiments (MPS/CUDA/CPU). Approximate cost: $0 (local).

## 4. Results (unmodified official public-set evaluator)

| Configuration | Hit Rate@10 | MRR | MTTC | TechnicalScore |
| --- | ---: | ---: | ---: | ---: |
| Official weak BM25 baseline | 0.125 | 0.068 | 9.810 | 0.139 |
| **Rules V1.2 (submitted)** | **0.970** | **0.613** | **3.155** | **0.826** |
| Rules + cross-encoder (all) | 0.970 | 0.607 | 3.095 | 0.825 |
| Rules + CE (buying-only gate) | 0.965 | 0.616 | 3.195 | 0.824 |

Per-scenario (submitted): Buying HR 0.975 / Browsing 0.9625 / Intent-Override
0.9667 / Boundary 1.000.

### 4.1 A negative result we keep on purpose
We implemented a full local cross-encoder reranker and evaluated it as an
additive signal, globally and gated to the Buying track. Per-scenario analysis
showed it helps Buying (+0.46 summed reciprocal rank) but hurts Browsing (−1.38),
because the simulator discloses only generic constraints (often a single word
like "cotton"), and a purely semantic reranker then promotes look-alike
distractors over the rule-locked exact match. Net effect on the official
composite is flat-to-slightly-negative and occasionally lowers Hit Rate. We
therefore **ship rules-only and keep the reranker OFF by default**, retaining it
as a reproducible experiment. This is our central engineering finding: on this
task, carefully engineered lightweight rules outperform a heavier semantic model
— which is precisely the light-execution outcome the problem statement rewards.

## 5. Evaluation methodology (leakage-safe)

`prompt_lab.py` splits self-labeled gold candidates into dev / validation /
held-out test. Prompt optimization sees only dev bad cases; validation only
accepts or rejects a new prompt (composite must improve and safety metrics must
not regress); the held-out test is read once, only after a final freeze. We never
place target `parent_asin`s, validation text, or test labels into prompts. All
retrieval and evaluation runs are reproducible from `reports/`.

## 6. Limitations and future work

- Public-set gains fix generic error classes but do not substitute for the
  hidden 800-session validation.
- Dense (vector) recall is scaffolded but not yet shown to close a real recall
  gap on this set; every miss we diagnosed was a ranking, not a recall, problem.
- The optional Qwen layer improves vague-intent classification in our gold set
  but is not required for the reported scores.

## 7. Team contributions

- Retrieval, state machine, and rule rerank; official-contract adapter; unit
  tests and leakage-safe evaluation harness.
- Cross-encoder reranker experiment, path portability, offline reproduction on
  macOS, and this report.
- Local Qwen setup and prompt-iteration experiments (development-only).
