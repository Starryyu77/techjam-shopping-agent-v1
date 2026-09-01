# ADR-001: Package Core Code and Centralize Project Documentation

- Status: Accepted
- Date: 2026-09-01

## Context

The repository root mixed public documentation, official adapters, reusable
modules, developer CLIs, and experiment entry points. This made the GitHub page
look unfinished and made it unclear which files were required for scoring.

The reorganization must preserve four constraints:

1. `submission/agent.py` remains the official evaluator entry point.
2. A clean checkout can run supported commands without `pip install`.
3. The rules-only path remains standard-library-only and deterministic.
4. Existing evidence, scripts, imports, links, and public metrics remain valid.

## Decision

- Keep only `.gitignore`, `AGENTS.md`, `README.md`, and `README.zh-CN.md` as
  root files.
- Group reusable Python modules under `shopping_copilot/`.
- Group user-facing CLIs under `tools/`.
- Group project documents under `docs/product`, `docs/project`,
  `docs/technical`, `docs/submission`, `docs/prompt`, and `docs/plans`.
- Keep `submission/agent.py` stable and import the official adapter from the
  package.
- Keep diagnostic scripts in `scripts/` for provenance and document their
  maturity in `scripts/README.md` instead of moving or deleting them.

## Alternatives considered

### Documentation-only cleanup

Lowest implementation risk, but the root would still expose six Python files
without explaining which were libraries versus CLIs. Rejected because it does
not solve the user-visible GitHub organization problem.

### `src/` layout requiring editable installation

Conventional packaging, but every command would require installation or
`PYTHONPATH` configuration. Rejected because competition reproduction should
work directly from a clean checkout.

### Root compatibility wrappers

Would preserve old commands, but the wrappers would keep the root visually
cluttered and create two apparent entry points. Rejected in favor of updating
all documented commands and validating them through tests.

## Consequences

- Commands use `python tools/<command>.py`.
- Imports use `shopping_copilot.<module>`.
- Technical and product links use their new `docs/` paths.
- A repository-layout test prevents future root-level drift.
- Historical external links to old root files may break; the README and docs
  index provide the canonical replacement paths.

## Verification

- Full repository test suite.
- Official development adapter over all 200 public sessions.
- Exact `submission/` package evaluation over all 200 public sessions.
- Fail-closed evidence rebuild and static-site build.
- Local Demo routes for Tour, Scheme B evidence, technical report, and
  reproduction instructions.
