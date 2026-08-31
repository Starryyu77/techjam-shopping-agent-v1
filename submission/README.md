# TechJam 2026 — Problem Statement 4: Conversational Shopping Agent

An offline, CPU-only, multi-turn shopping agent for the TikTok TechJam 2026
Conversational E-Commerce Search Challenge. It finds a hidden target product as
early and as highly ranked as possible over a frozen 50,000-product Amazon
Reviews 2023 (Clothing, Shoes & Jewelry) catalog.

## Design in one line

> Under strict light-execution / offline / read-only / 10-turn constraints, an
> explicit dialogue **state machine** + **SQLite FTS5 hybrid retrieval** + a
> candidate-driven **question policy** beats heavier LLM/vector stacks on the
> official composite — verified with reproducible experiments.

## Required interface

`submission/agent.py` exports `Agent` implementing the official contract:

```python
class Agent:
    def reset(self, session_id: str, user_profile: dict) -> None: ...
    def respond(self, session_id: str, user_message: str, turn: int, top_k: int) -> dict: ...
```

`respond` returns `{message, ask_attribute, recommendations:[{parent_asin}], usage}`.

## Setup and run (any OS: macOS / Linux / Windows)

Python 3.11+. The scored path uses the **standard library only** — no
third-party packages, no network, no API keys.

```bash
# 1) Point the agent at the official frozen catalog (from the participant kit).
export TECHJAM_CATALOG=/path/to/techjam-conversational-search/data/catalog.jsonl

# 2) Run the official public-set evaluator against this agent.
python evaluate_official.py \
    --official-root /path/to/techjam-conversational-search \
    --intent-backend rules \
    --output reports/official_public_rules.json

# 3) Interactive multi-turn chat (offline, rules).
python chat.py --intent-backend rules
```

If the official repo is checked out as a sibling of this repo
(`../techjam-conversational-search`), the catalog is auto-detected and
`--official-root` / `TECHJAM_CATALOG` can be omitted.

## Network / model policy (official scoring)

- **Default = fully offline, CPU, rules-only.** No live credentials required.
- Optional development layers (all OFF by default, never needed for scoring):
  - `--intent-backend hybrid|model`: a **localhost-only** Qwen3-8B intent layer
    (endpoint restricted to `127.0.0.1`/`localhost`/`::1`; no API keys read).
  - `use_reranker=True`: a bundled local cross-encoder reranker experiment.
- If network is disabled during scoring, the agent runs unchanged.

## Reported public-set scores (unmodified official evaluator)

| Version | Hit Rate@10 | MRR | MTTC | TechnicalScore |
| --- | ---: | ---: | ---: | ---: |
| Rules V1 (pre-fix) | 0.550 | 0.262 | 6.740 | 0.439 |
| Rules V1.1 | 0.950 | 0.628 | 3.495 | 0.814 |
| Rules V1.2 | 0.970 | 0.613 | 3.155 | 0.826 |
| **Rules V1.3 (submitted)** | **0.995** | **0.644** | **2.215** | **0.867** |
| Official weak BM25 baseline | 0.125 | 0.068034 | 9.810 | 0.10671 |

`TechnicalScore = 0.50·HitRate@10 + 0.30·MRR + 0.20·Efficiency`,
`Efficiency = clip((11 - MTTC)/10, 0, 1)`. Public-set numbers show generic
error classes are fixed; they do not replace hidden-set validation. Run-to-run
results for the submitted rules path are deterministic across repeated public-set runs.

## Verify

```bash
python -m py_compile shopping_agent.py chat.py prompt_lab.py official_agent.py
python -m unittest discover -s tests -v   # 79 current tests
```

## What is inside

- `shopping_agent.py` — dialogue state machine (hard/soft/negative slots, intent
  override erase-and-rewrite), FTS5 hybrid retrieval + rule rerank, candidate
  question policy (coverage × entropy).
- `official_agent.py` — adapter enforcing the official contract (`top_k=10`,
  `1<=turn<=10`, attribute whitelist, dedup, valid-id filtering).
- `reranker.py` — optional bundled cross-encoder (default OFF; experiment).
- `prompt_lab.py` — leakage-safe dev/validation prompt-iteration harness.
- `reports/` — evaluation artifacts for every configuration.
- `REPORT.md` — architecture, models, cost, limitations, team contributions.

See `../REPORT.md` (repo root) for the full technical report.
