# Script Guide

[Root README](../README.md) | [中文 README](../README.zh-CN.md)

This directory contains two very different kinds of code:

1. **Supported delivery scripts** used to evaluate, build, and publish the project.
2. **Research diagnostics** retained as reproducible evidence of how V1.1–V1.3
   were developed. Most diagnostics are snapshots, not stable public CLIs.

中文说明：前两节列出正常评测、证据重建和发布时应使用的稳定入口；后续表格中的
脚本属于诊断、消融或运维快照，保留它们是为了实验溯源，不代表需要逐个运行。

Run commands from the repository root. Unless a command accepts
`--official-root`, the diagnostic scripts expect the official participant kit at
`../techjam-conversational-search`.

## Recommended release path

```bash
# 1. Verify the full development repository with the official evaluator.
python evaluate_official.py \
  --official-root ../techjam-conversational-search \
  --intent-backend rules \
  --output reports/official_public_rules.json

# 2. Verify the exact minimal submission package.
python scripts/run_submission_eval.py \
  --official-root ../techjam-conversational-search \
  --output reports/submission_public_rules.json

# 3. Rebuild fail-closed website evidence and all 200 public traces.
python scripts/build_demo_evidence.py \
  --official-root ../techjam-conversational-search

# 4. Run repository contracts and build the portable static bundle.
python -m unittest discover -s tests -v
python scripts/build_static_site.py
```

The public website itself is served locally with:

```bash
python demo/server.py --port 8000
```

Open `http://127.0.0.1:8000`; do not open `demo/static/tour.html` through
`file://`, because the Tour depends on evidence JSON and site-relative assets.

## Supported scripts

| Script | Purpose | Stable inputs / output |
| --- | --- | --- |
| `build_demo_evidence.py` | Replay all 200 official public sessions and regenerate the frozen Tour evidence | `--official-root`, optional `--report`; writes `demo/evidence/` and fails closed on drift |
| `build_static_site.py` | Build a portable Cloudflare/GitHub Pages bundle | optional `--output`; default `_site/` |
| `run_submission_eval.py` | Evaluate `submission.agent.Agent` directly, rather than the full development adapter | `--official-root`, optional `--output` JSON |

Canonical entry points outside this directory:

| Entry point | Purpose |
| --- | --- |
| [`evaluate_official.py`](../evaluate_official.py) | Full repository evaluation with rules/model/hybrid switches |
| [`prompt_lab.py`](../prompt_lab.py) | Scheme B prompt evaluation and iteration |
| [`demo/server.py`](../demo/server.py) | Local Judge Tour and optional `/sandbox` |
| [`chat.py`](../chat.py) | Interactive offline conversation CLI |
| [`video/package.json`](../video/package.json) | V3 film tests, render, and release commands; see [`video/README.md`](../video/README.md) |

All supported Python entry points implement `--help`.

### Which evaluator should I run?

- Use `evaluate_official.py` while developing. It exposes rules/model/hybrid and
  optional reranker switches but still delegates scoring to the unmodified
  official evaluator.
- Use `scripts/run_submission_eval.py` before delivery. It imports
  `submission.agent.Agent` directly and therefore checks the exact minimal
  package a reviewer will inspect.
- The reported submitted score must come from `--intent-backend rules`; optional
  model and reranker experiments are separate evidence.

### Prompt evolution commands

```bash
python prompt_lab.py evaluate --help
python prompt_lab.py optimize --help
```

Scheme B uses scrubbed dev evidence, a strict non-regression gate, one opaque
validation decision, and an untouched held-out split. The accepted v002 snapshot
is recorded in `reports/scheme_b_prompt_evolution_verified.json`.

## Ranking and recall diagnostics

These scripts explain how the submitted rules path was selected. They use the
official public development split and may monkey-patch internal search methods,
so run them only in a disposable process from the repository root.

| Script | Question answered | Notes |
| --- | --- | --- |
| `analyze_gaps.py` | Which near-tied candidates outrank known misses? | Fixed sample IDs; diagnostic output only |
| `analyze_rank_tail.py` | What distinguishes target products in the rank tail? | Public-set analysis snapshot |
| `check_degenerate.py` | Which generated intent cards are too weak to retrieve their targets? | Synthetic diagnosis |
| `diagnose_misses.py` | Why does a public session miss or hit late? | Prints per-session causes |
| `probe_recall.py` | Does the target enter the immediate policy candidate pool? | Small recall probe |
| `probe_recall_full.py` | Is the target present anywhere in the full FTS5 recall pool? | Source of the 200/200 recall-saturation finding |
| `tie_signal.py` | Does popularity separate genuine near-ties? | Supports the banded tiebreaker decision |
| `why_regress.py` | Which sessions regress under an experimental ranker? | Differential diagnosis |

## Parameter sweeps and ablations

| Script | Experiment | Runtime expectations |
| --- | --- | --- |
| `cv_band.py` | Cross-split stability of the popularity band | CPU, official public split |
| `sweep_pop.py` | Popularity-band sweep | CPU; repeated full evaluator runs |
| `sweep_rerank.py` | Reranker-weight sweep | CPU; repeated full evaluator runs |
| `exp_d1_diag.py` | D1 feasibility / target reachability | CPU diagnostic |
| `exp_p1_rerank.py` | P1 semantic reranking | Optional GPU/model dependencies; has argparse |
| `exp_p3_diag.py` | P3 question-sequence diagnosis | CPU diagnostic |
| `exp_p3_policy.py` | Question-policy ablation | CPU, public evaluator |
| `exp_p3b_policy.py` | Conservative question-policy variants | CPU, public evaluator |
| `validate_crossencoder.py` | Local MiniLM cross-encoder validation | Requires PyTorch, Transformers, and local model files |

## Synthetic stress tests

| Script | Purpose | Boundary |
| --- | --- | --- |
| `diag_synth.py` | Diagnose failures on synthetic catalog targets | Not official-score evidence |
| `stress_synth.py` | Stress retrieval/ranking on generated sessions | Not curated like the official target set |

## Local Qwen utilities (Windows PowerShell)

| Script | Purpose |
| --- | --- |
| `install_local_qwen.ps1` | Install the pinned llama.cpp runtime and Qwen3-8B Q4_K_M GGUF |
| `start_local_qwen.ps1` | Start the localhost-only OpenAI-compatible endpoint on port 8080 |
| `stop_local_qwen.ps1` | Stop only the project-managed llama.cpp process identified by its PID file |

The optional Qwen layer never participates in the official rules-only score.
Do not run held-out prompt evaluation until the prompt and evaluation code are
frozen and the explicit held-out confirmation contract is satisfied.

## Maintenance rules

- Add new supported commands to the **Supported scripts** table and give them a
  working `--help` path.
- Add one-off investigations to the relevant diagnostic table instead of
  presenting them as release commands.
- Keep public-set, synthetic, opaque-validation, held-out, and private-set claims
  explicitly separated.
- Do not place credentials, private labels, or full upstream catalog data in
  scripts or generated website evidence.
