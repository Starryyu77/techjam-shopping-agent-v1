# Surely — Conversational Shopping Copilot

> **From prompt to purchase:** conversation, self-iteration, and ranked commerce.

**[Try the live Evidence Tour](https://shopping-copilot-techjam.pages.dev/)** ·
**[Watch the public demo](https://youtu.be/iRec-9CM9D4)** ·
**[View the public source code](https://github.com/Starryyu77/techjam-shopping-agent-v1)**

## Inspiration

Shopping search works well when a customer already knows the exact product name.
It becomes much harder when the request is conversational: “something
comfortable for work,” “show me alternatives,” or “actually, not cotton — I
want wool.” A useful shopping assistant must understand an evolving intent,
remember the right constraints, forget superseded ones, ask only the question
that changes the ranking, and explain why the results moved.

We built **Surely** to make that journey inspectable from the first prompt to the
ranked product list. Instead of treating conversation as decoration around a
search box, we designed it as the control layer for retrieval, recommendation,
and continuous prompt improvement.

## What it does

Surely is a multi-turn e-commerce copilot over a frozen catalog of 50,000
clothing, shoe, and jewelry products derived from Amazon Reviews 2023. It:

- distinguishes concrete **Buying** requests from exploratory **Browsing**;
- maintains explicit hard, soft, negative, and rejected-item preferences;
- handles **Intent Override** by erasing outdated constraints before applying
  the replacement, rather than appending contradictory history;
- retrieves candidates with SQLite FTS5 and transparently reranks them;
- chooses the next clarification using candidate coverage and entropy; and
- returns an ordered Top-10 while exposing how each answer changed the state and
  ranking.

The public **[Evidence Tour](https://shopping-copilot-techjam.pages.dev/)** lets
judges replay real official-public cases, inspect the state transition, trace the
retrieval and reranking pipeline, and compare each Top-10 before and after a
customer answer.

## How we built it

The project has two deliberately separated layers.

### 1. Frozen competition path

The submitted Agent uses Python, SQLite FTS5, a deterministic dialogue state
machine, and transparent rule reranking. It runs offline on CPU with no API key,
no paid model, no network dependency, and zero reported model tokens. The
official evaluator calls `submission/agent.py`; the website, narration, ads, and
experimental model layers never alter this scored path.

### 2. Prompt Evolution Lab

We also built a real prompt self-iteration workflow for a local Qwen3-8B intent
layer. It does not blindly rewrite itself at runtime. Each round follows a
guarded contract:

1. evaluate the current prompt on a protected 23/12 golden-case split;
2. inspect confusion signals and representative failures;
3. diagnose a general error class rather than memorize a case;
4. make one generalized prompt rewrite;
5. reject candidates that violate structural or regression guards; and
6. re-evaluate before accepting the next version.

The Evidence Tour exposes all six frozen rounds, the train/held-out curve, prompt
length, confusion signals, a controlled newline-sensitivity check, and four
deterministic walkthroughs from input to diagnosis to accepted rewrite. This
makes “self-evolution” reviewable evidence, not a black-box claim.

## Results and evidence

On the unmodified official evaluator’s **200 labeled public development
sessions**, the frozen rules path achieved:

| Hit Rate@10 | MRR | MTTC | Efficiency | TechnicalScore |
| ---: | ---: | ---: | ---: | ---: |
| **0.995** | **0.644355** | **2.215** | **0.8785** | **0.866507** |

That is approximately **8.1×** the official weak BM25 starter TechnicalScore of
0.10671. These are public-development results only; performance on the
organizer-private 800 sessions remains unknown.

Separately, the Prompt Evolution Lab’s protected golden-case experiment improved
the best observed held-out score from **86.7 to 91.7** across six rounds. This is
an intent-prompt experiment, not the official competition score.

## Challenges we faced

### Recall was not the real bottleneck

The target product was retrievable in every public session, yet a few cases
still missed the scored Top-10. The difficult part was lifting the correct item
above near-identical products when the customer had revealed only a generic
constraint. We stopped adding retrieval complexity and focused on a banded
near-tie signal that improved the ranking tail without disturbing clear wins.

### Conversation history can become wrong

Appending every utterance created contradictions after “actually…” or “instead
of…”. Solving this required versioned state and explicit erase-and-rewrite
semantics, not a larger prompt.

### Self-iteration needs scientific guardrails

A prompt can improve a visible example while becoming longer, brittle, or
overfit. The protected split, one-change-per-round rule, structural guards, and
re-evaluation step were essential for making iteration credible.

## Accomplishments we are proud of

- A reproducible, standard-library scoring path that runs on ordinary CPU
  hardware.
- An inspectable multi-turn state machine that handles Buying, Browsing, and
  Intent Override.
- A candidate-driven question policy that asks for information only when it can
  change the recommendation.
- A six-round Prompt Evolution Lab with preserved artifacts and explicit
  acceptance guards.
- A deterministic judge-facing website that works without a live model and
  keeps public evidence separate from unknown private performance.
- A negative-result trail showing why a heavier cross-encoder was not shipped in
  the official path.

## What we learned

First, good conversational commerce is less about generating fluent text and
more about maintaining correct state. Second, asking fewer questions requires a
model of candidate uncertainty, not a fixed dialogue script. Third, lightweight
and transparent ranking can outperform heavier components when the actual
bottleneck is understood. Finally, prompt iteration becomes trustworthy only
when every rewrite is evaluated, bounded, and reversible.

## What’s next

- denser semantic recall for open-ended Browsing requests;
- richer profile-aware ranking while preserving explicit user control;
- second-price sponsored auctions with budget pacing and frequency caps;
- broader prompt-evolution test suites and automated regression triage; and
- continued separation between organic recommendation quality and transparent,
  demo-only monetization experiments.

## Try it

- **Live Evidence Tour:** https://shopping-copilot-techjam.pages.dev/
- **Mechanism & Prompt Lab:** https://shopping-copilot-techjam.pages.dev/?step=3
  Open the **Prompt Evolution Lab** tab on Step 3.
- **Public GitHub repository:** https://github.com/Starryyu77/techjam-shopping-agent-v1
- **GitHub Pages fallback:** https://starryyu77.github.io/techjam-shopping-agent-v1/
