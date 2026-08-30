# Conversational Shopping Copilot — TechJam 2026 Track 4

[English](README.md) | [简体中文](README.zh-CN.md)

An offline, CPU-only, multi-turn shopping agent over the frozen 50,000-product
Amazon Reviews 2023 `Clothing_Shoes_and_Jewelry` catalog.

> **Try the judge-facing evidence tour:**
> [shopping-copilot-techjam.pages.dev](https://shopping-copilot-techjam.pages.dev/)

The scored path uses the Python standard library, SQLite FTS5, and deterministic
rules. It needs no network, API key, paid model, or GPU.

## Verified public-set result

Measured with the unmodified official evaluator on the 200 labeled public
development sessions:

| System | HitRate@10 | MRR | MTTC | Efficiency | TechnicalScore |
| --- | ---: | ---: | ---: | ---: | ---: |
| Official weak BM25 starter | 0.125 | 0.068034 | 9.810 | 0.1190 | 0.10671 |
| **Rules V1.3, submitted path** | **0.995** | **0.644355** | **2.215** | **0.8785** | **0.866507** |

That is about **8.1× the starter TechnicalScore**. These are public-set results,
not evidence about the organizer's 800 private sessions.

## What the project demonstrates

- **Buying vs. Browsing routing:** concrete requests lock constraints; vague
  requests trigger targeted clarification.
- **Explicit dialogue state:** hard, soft, negative, rejected-item, and raw
  retrieval evidence remain inspectable across turns.
- **Intent Override:** superseded preferences are erased and rewritten instead
  of appended.
- **Lightweight retrieval and ranking:** SQLite FTS5 recall, transparent rule
  reranking, and a banded popularity tiebreaker.
- **Candidate-driven questions:** coverage × entropy selects the most useful
  next attribute.
- **Evidence-first delivery:** the public website replays frozen official-public
  traces and never depends on a live LLM.
- **Demo-only commercial extension:** a clearly separated relevance-aware ad
  auction illustrates monetization without altering organic ordering.

## Quick start

### 1. Clone

```bash
git clone https://github.com/Starryyu77/techjam-shopping-agent-v1.git
cd techjam-shopping-agent-v1
```

Python 3.11+ is recommended.

### 2. Run the official public evaluator

Place the official participant kit next to this repository, or pass its path
explicitly:

```bash
python evaluate_official.py \
  --official-root ../techjam-conversational-search \
  --intent-backend rules \
  --output reports/official_public_rules.json
```

### 3. Run locally

```bash
# Judge-facing tour at /; optional legacy chat sandbox at /sandbox
python demo/server.py --port 8000

# Interactive CLI, fully offline
python chat.py --intent-backend rules
```

Open `http://127.0.0.1:8000`.

### 4. Verify

```bash
python -m unittest discover -s tests -v
```

Current expected result: **74 tests pass**.

## Evidence reproduction

The repository ships 200 frozen public-session traces so the Tour works in a
clean checkout. Rebuild them only when the Agent or evidence contract changes:

```bash
python scripts/build_demo_evidence.py \
  --official-root ../techjam-conversational-search
```

The builder fails closed on metric drift, invalid or duplicate ASINs, trace/report
mismatches, missing hashes, non-public cases, or an unfrozen canonical-case set.

## Architecture

```text
user message
  → Buying / Browsing intent router
  → versioned constraint state
  → SQLite FTS5 candidate retrieval
  → rule reranking + banded popularity tiebreaker
  → candidate-driven clarification
  → message + ask_attribute + Top-10 parent_asin
```

The official evaluator calls `submission/agent.py`. Demo narration, ad placement,
and the legacy chat UI live outside that scored path.

## Repository map

| Path | Purpose |
| --- | --- |
| `submission/agent.py` | Required official `Agent` interface |
| `shopping_agent.py` | Intent, state machine, retrieval, ranking, question policy |
| `evaluate_official.py` | Adapter for the unmodified official evaluator |
| `demo/static/tour.*` | Judge-facing Guided Evidence Tour |
| `demo/evidence/` | Shipped public evidence artifacts and 200 traces |
| `demo/canonical_cases.json` | Source-controlled canonical-case freeze |
| `scripts/build_demo_evidence.py` | Evidence regeneration and validation |
| `scripts/build_static_site.py` | Portable static deployment bundle |
| `reports/` | Reproducible experiment and evaluator outputs |
| `reranker.py` | Optional cross-encoder experiment, OFF by default |

## Claim and data boundaries

- The catalog and official datasets are read-only.
- Only official public labels appear in the shipped replay evidence.
- The organizer-private 800-session performance remains unknown.
- The public score is not called a hidden-set, private-set, or final score.
- Optional Qwen and cross-encoder layers are experiments, not dependencies of
  the submitted rules path.
- The ad auction uses simulated bids and budgets and is never called by the
  official evaluator.

## Documentation

| Document | Audience |
| --- | --- |
| [Technical report](REPORT.md) | Architecture, experiments, results, limitations |
| [Product brief, Chinese](PRODUCT.md) | Product and demo boundaries |
| [Devpost draft](DEVPOST.md) | Submission narrative |
| [Judge Tour design](docs/plans/2026-08-30-judge-facing-demo-design.md) | Design and handoff specification |
| [Demo walkthrough](demo/WALKTHROUGH.md) | Tour operation and evidence stations |
| [Video script](demo/VIDEO_SCRIPT.md) | Three-minute recording plan |
| [Submission package](submission/README.md) | Minimal evaluator-facing package |
| [Development plan](PLANS.md) | Completed milestones and intentionally deferred work |
| [Prompt iteration loop](docs/loop.md) | Leakage-safe prompt acceptance process |
| [Engineering lessons](docs/loop-lessons.md) | Failure patterns and fixes |
| [Intent prompt v001](prompts/system_prompt_v001.md) | Optional local-model parser contract |

## Deployment and links

- **Live Tour:** https://shopping-copilot-techjam.pages.dev/
- **GitHub Pages fallback:** https://starryyu77.github.io/techjam-shopping-agent-v1/
- **Source repository:** https://github.com/Starryyu77/techjam-shopping-agent-v1
- **Demo video:** pending final recording and public YouTube upload

## License and upstream data

Follow the official participant kit's data and submission terms. This repository
does not redistribute the full upstream Amazon Reviews 2023 dataset; the Tour
contains only the competition's labeled public-session evidence required for
reproducible demonstration.
