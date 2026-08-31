# Trace Microscope Mechanism Design

## Problem

The previous Mechanism step listed four expandable cards. It named the right
components but did not prove that the selected Replay turn actually passed
through them. The information was static, text-heavy, and disconnected from the
recommendation change shown one step earlier.

## Decision

Use a trace-linked mechanism inspector with five interactive stages:

1. Intent Router
2. Versioned State
3. SQLite FTS5 Recall
4. Rule Reranker
5. Candidate-driven Question Policy

The context bar persists the current official sample ID, turn, user signal, and
rank impact. Each stage pairs a stable implementation contract with evidence
from `currentTrace.turns[currentTurnIdx]`.

## Live evidence

- Route: `domain_intent`, `dialogue_act`, confidence, next question.
- State: added, removed, retained constraint values.
- Recall: real query terms, visible result count, negative-filter status.
- Rerank: current Top-3 and movement relative to the previous turn.
- Question: selected attribute, known-state count, threshold, coverage × entropy rule.

## Visual encoding

- Route uses a labeled two-lane fork and highlights the active Buying/Browsing path.
- State uses Before → Delta → After with directly labelled add/remove/retain counts.
- Recall uses a narrowing funnel from the 50,000-product catalog to the visible list.
- Rerank uses a directly labelled Top-3 podium; bar height represents position,
  not an invented score.
- Question uses a candidate → coverage × entropy → threshold → ask decision chain.

Every diagram keeps a text equivalent in the live evidence panel and never relies
on color alone.

The ranking score anatomy remains visible across stages: recall rank base,
category, hard/soft constraints, hard miss, profile, rating, and popularity
tie-break. Negative experiments are available through native disclosure rather
than occupying the primary judge path.

## Boundaries

- No synthetic trace or invented candidate score.
- The broad internal policy pool is described from source code; live evidence
  labels only the visible candidate count captured in the frozen trace.
- Source locations and metric deltas are tied to shipped code and reports.
- At 1280×720 the main inspector fits without page overflow. Narrow panels use
  horizontal pipeline navigation and a single natural page scroll.
