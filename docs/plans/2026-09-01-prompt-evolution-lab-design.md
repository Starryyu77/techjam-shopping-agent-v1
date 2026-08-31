# Prompt Evolution Lab — Website Design

## Goal

Expose the repository's prompt self-evolution work as a judge-facing,
evidence-backed interaction instead of a static claim. The framing is
continuous technical iteration, not a post-hoc explanation for a weak result.

## Placement

Step 3 contains two modes:

- **Shipped Pipeline** — the deterministic mechanism used by the official score path.
- **Prompt Evolution Lab** — the experimental local-Qwen iteration layer.

This keeps both capabilities visible without blending their evidence claims.

## Experience contract

The Lab reads only frozen `prompt_evolution.json` evidence generated from the
repository's round logs, golden cases, sensitivity reports, and evolution
source. It provides:

1. a six-round train/test curve;
2. per-round score, prompt length, confusion signal, and iteration action;
3. a visual evaluate-diagnose-rewrite-guard-re-evaluate loop;
4. controlled sensitivity comparisons;
5. four deterministic golden-case walkthroughs;
6. an explicit boundary between this experiment and the official score path.

## Truth and safety boundaries

- Do not label a deterministic walkthrough as a live model response.
- Do not imply private-800 performance.
- Do not mix experimental Qwen metrics with official Rules V1.3 metrics.
- Do not expose hidden or private labels.
- Keep the raw source artifacts and hashes inspectable in the repository.

## Verification

- Evidence schema and source values are tested.
- Direct `/?step=3` deep links must serve the Tour.
- Desktop and narrow viewports must have no page-level horizontal overflow.
- Round switching, case switching, walkthrough completion, and mode return are
  exercised in a real browser.
