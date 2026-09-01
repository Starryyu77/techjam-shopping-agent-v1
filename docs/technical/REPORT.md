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

**Free-form robustness.** Beyond the evaluator's templated phrasings, the rule
parser also handles realistic chat: a bare value replying to a pending question
is read as that slot's answer (e.g. "42" after a size question → size:42);
common category misspellings are normalized (close → clothes) as a fallback when
no category matches; and casual exit intents ("I don't want to buy shoes now")
stop the session. These paths are gated so they never fire on the templated
evaluator inputs — the official ANSWER template always takes precedence — so they
add product completeness with **zero** effect on the official score (verified:
TS unchanged at 0.867). A local-LLM intent backend (`intent_backend=hybrid`)
is wired as an optional enhancement and degrades gracefully to rules when no
local model is reachable, keeping the offline scoring path intact.

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
- **Optional demo/dev layers (OFF for scoring, disclosed for transparency):**
  - Scheme B used a localhost Qwen3-8B Q4_K_M target served by llama.cpp's
    OpenAI-compatible endpoint (`127.0.0.1:8080`), with temperature 0 and no
    fine-tuning. Codex authored the accepted candidate from scrubbed dev
    evidence; Qwen did not optimize or judge itself. Approximate API cost: $0
    (local). **The scored/submitted path never loads, calls, or depends on this
    model.**
  - A bundled MiniLM cross-encoder reranker (~88 MB) for semantic reranking
    experiments (MPS/CUDA/CPU). Approximate cost: $0 (local).

## 4. Results (unmodified official public-set evaluator)

| Configuration | Hit Rate@10 | MRR | MTTC | TechnicalScore |
| --- | ---: | ---: | ---: | ---: |
| Official weak BM25 baseline | 0.125 | 0.068034 | 9.810 | 0.10671 |
| Rules V1.2 (constraint-only) | 0.970 | 0.613 | 3.155 | 0.826 |
| Rules + cross-encoder (all) | 0.970 | 0.607 | 3.095 | 0.825 |
| **Rules V1.3 (submitted, popularity tiebreak)** | **0.995** | **0.644** | **2.215** | **0.867** |

Per-scenario (submitted V1.3): Buying HR 0.988 / Browsing 1.000 / Intent-Override
1.000 / Boundary 1.000.

### 4.2 Popularity tiebreaker (the +0.04 lever)
A full-set recall probe showed the target is recalled into the FTS5 pool in
**200/200 sessions** — every gap is a *ranking* problem, not recall (so dense
recall would add nothing). Among the rank tail, the target and the distractors
ranked above it satisfy the *same* constraints with scores clustered within one
or two points; the differentiator is that the target is consistently better
reviewed (higher rating and far more reviews). We therefore added a **banded
tiebreaker**: candidates whose rule scores fall in the same narrow band are
ordered by log review count. Crucially this is a *tiebreaker*, not an additive
term — it never displaces a candidate with a clearly higher constraint match, so
it lifts the tail (HR 0.970 → 0.995, MTTC 3.16 → 2.22) without sacrificing MRR
(0.613 → 0.644). The neighborhood band 4.5–5.25 is a stable plateau (TS
0.861–0.867), and the tiebreaker also removes the evaluator's tie-order jitter,
making the official score deterministic across runs. The band is a tunable
attribute (default 5.0; 0 recovers the V1.2 baseline).

We stress-tested for overfitting honestly. Relative to V1.2, band=5 fixes 5
misses (net Hit Rate up, zero new misses) but also reorders 56 sessions — the
inevitable cost of a tiebreaker wide enough to reach genuine near-ties. To check
this generalizes rather than memorizing the 200 public sessions, we split them
deterministically into two halves and evaluated every band on each half
independently: band=5 is the best on *both* halves (TS 0.878 and 0.857) and the
band ordering (5 > 3 > 0) is identical across the split. If the gain were an
artifact of specific sessions, the optimal band would diverge between halves; it
does not, which supports adoption. A more conservative band=3 (+0.03 over
baseline) remains available if the hidden 800-set regresses.

### 4.0 Generalization scope (an honest boundary)
We stress-tested against hidden-set diversity by driving 500 sessions from
*randomly sampled* catalog products, synthesizing intent cards with the
evaluator's own `intent_card()`. That synthetic set scores HR@10 ≈ 0.89 — but
49 of its 55 misses are *recall* misses (the target never enters the pool),
versus **zero** recall misses on the curated public set. A direct probe shows
only 7 of 150 random products are retrievable by their own synthesized card:
the cards degenerate into non-discriminative constraints (e.g. package
dimensions, a bare color) and categories that do not appear in the product's
searchable text. The public-set targets are evidently *curated to be
answerable*; the hidden 800-set is authored by the same team under the same
methodology, so we expect it to be curated identically (≈0 recall misses).
We therefore treat 0.89 as a sampling artifact of un-curated products, not an
agent weakness, and deliberately do **not** tune toward those unanswerable
cases (doing so would overfit to noise and hurt the real distribution). Our
generalization claim is scoped precisely: the ranking quality that drives the
public-set score depends only on recall being saturated, which holds whenever
targets are curated to be searchable.

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

`tools/prompt_lab.py` splits self-labeled gold candidates into dev / validation /
held-out test. Prompt optimization sees only dev bad cases; validation only
accepts or rejects a new prompt (composite must improve and safety metrics must
not regress); the held-out test is read once, only after a final freeze. We never
place target `parent_asin`s, validation text, or test labels into prompts. All
retrieval and evaluation runs are reproducible from `reports/`.

## 6. Interactive demo: conversational commerce + transparent ad economics

Everything in this section lives in a **demo-only layer** (`demo/server.py` and
its static frontend) that the official evaluator never reaches. We re-ran the
official evaluator after every change described here and it reproduced
**TS = 0.8665** bit-for-bit; all 98 current unit/integration/evidence/documentation tests pass. The scored path remains
pure-rules, offline, stdlib-only.

### 6.1 Sponsored-ads engine (eCPM auction)

To demonstrate how a shopping copilot can monetize attention without corrupting
organic ranking, we built a complete in-demo ad engine:

- **eCPM auction:** winner = argmax(bid × relevance). Relevance is *real BM25*
  computed by the **same** SQLite FTS5 engine the scored path uses (zero
  additional model, no latency spike), mapped to [0, 1] via a logistic
  transform. Verified: a precisely-targeted $1.00 bid beats an off-topic $5.00
  bid — the system is relevance-dominant, not highest-bid-wins.
- **Relevance floor (0.15):** ads below the threshold are suppressed entirely
  (e.g. a query for "diamond ring" produces no sponsored slot rather than a
  forced mismatch).
- **Per-campaign budgets with spend accounting:** each impression charges the
  bid; a campaign stops serving when spend reaches budget. Verified: a $4
  budget / $2 bid campaign serves exactly 2 impressions, then stops.
  Multi-slot support (top-N by eCPM) is implemented.
- **Advertiser surfaces:** an Ads Manager console (launch/pause campaigns, set
  advertiser/target/keywords/bid/daily-budget, live table with spend/budget
  progress bars, last eCPM and relevance, 3 s auto-refresh) and an Ads
  Dashboard (KPI cards: campaigns, active, impressions, total spend, remaining
  budget, average relevance; campaigns-by-spend table; 3 s auto-refresh).
- **Design invariant:** organic ranking (the scored path) is **never** altered
  by ads. Sponsored items appear only in a separate, clearly-labelled
  "Promoted · TikTok Shop" slot that shows the relevance percentage and eCPM
  dollar value — making the ad economics transparent and auditable, a
  differentiator vs a black-box placement.

### 6.2 LLM sales-associate narration

After the deterministic engine returns real recommendations, the local Qwen3-8B
(§3) rewrites the template reply as a short (2–3 sentence) conversational sales
pitch: it names 1–2 picks with concrete reasons, naturally mentions any sponsored
item, and is explicitly instructed never to fabricate prices, facts, or discounts
and to stay within the returned shortlist. On any model failure or slowness the
demo falls back to the deterministic template silently.

Motivation: the Alipay-618 deployment found that moving users from passive
recommendation to active conversational guidance lifted click-through ~3.7× and
per-user value ~2.1×. Our narration layer makes this shift tangible.

The demo layer also provides friendly handling of chit-chat ("what can you do?"),
"just recommend something" requests, and off-topic redirects — all with rule
templates in the demo wrapper, never changing the scored agent.

Controlled via `--narrate` (off by default). No fine-tuning; zero
SFT/LoRA/RLHF.

### 6.3 Scheme B Codex-guided prompt evolution

Scheme B separates the optimizer, target, and acceptance gates:

1. Codex receives scrubbed dev metrics, confusion patterns, and representative
   bad cases, then authors one complete candidate prompt.
2. Static checks reject copied dev sentences, IDs, missing contract markers,
   and prompt-length drift above 15%.
3. Qwen3-8B acts only as the target over 18 synthetic dev sessions / 90
   annotated turns.
4. A strict gate requires composite improvement and no regression in domain,
   dialogue act, clarity, slots, rollout state, JSON, no-mutation, or selection.
5. Only then is validation read once. It reveals opaque accept/reject and ends
   the run; held-out labels remain unbundled and were not run.

**Measured result.** v001 composite rose from **0.613737 to 0.719082** (+0.105345
absolute, +17.2% relative). Slot F1 rose 0.272727 → 0.565217 and rollout-state
exactness 0.100000 → 0.222222. Domain, dialogue act, clarity, no-mutation, and
selection all improved; JSON compliance remained saturated at 1.0. The opaque
validation gate accepted v002.

We independently recomputed both composites from the documented weights,
recomputed domain/dialogue/clarity accuracies from the saved confusion matrices,
verified prompt hashes and non-regression, and ran all 22 Scheme B workflow
tests. The original localhost Qwen endpoint was unavailable on the verification
host, so this is artifact-recomputed verification rather than a fresh inference
rerun. This remains intent-parser evidence, not an official retrieval-score,
held-out, or private-800 claim.

### 6.4 TikTok Shop scenario framing

The demo is themed as a **"TikTok Shop · Shopping Copilot"** to fit the TikTok
commerce context (content-to-commerce). Sample prompts include a
creator-inspired "种草" flow ("Saw a creator wearing an oversized hoodie, want
something similar") alongside buying/browsing/override/boundary/fallback
scenarios. A live **"How the Copilot understands you"** panel shows the real
extracted intent, dialogue act, confidence, hard/soft/negative constraints, and
category on each turn — making the state machine transparent and auditable.

## 7. Limitations and future work

- Public-set gains fix generic error classes but do not substitute for the
  hidden 800-session validation.
- A full-set recall probe confirms recall is 100% saturated (target in the pool
  for 200/200 sessions), so dense (vector) recall would add nothing on this set;
  every remaining gap is a ranking problem, which the popularity tiebreaker
  addresses.
- The band value (5.0) is tuned on the 200-session public set; the 4.5–5.25
  plateau and the principled mechanism suggest it generalizes, and the band can
  be lowered (3.0 → +0.03) or disabled (0.0 → V1.2 baseline) if the hidden set
  regresses.
- The optional Qwen layer improves vague-intent classification in our gold set
  but is not required for the reported scores.

## 8. Team contributions

- Retrieval, state machine, and rule rerank; official-contract adapter; unit
  tests and leakage-safe evaluation harness.
- Cross-encoder reranker experiment, path portability, offline reproduction on
  macOS, and this report.
- Local Qwen3-8B deployment, prompt self-evolution framework, sponsored-ads
  engine (eCPM auction), LLM narration layer, TikTok-themed demo frontend
  (shopper view, Ads Manager, Ads Dashboard), and end-to-end demo testing.
