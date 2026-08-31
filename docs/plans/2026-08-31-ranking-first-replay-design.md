# Ranking-First Replay Design

## Problem

The previous default Buying trace (`public_0030`) ended after one turn. It proved
that the target could rank first, but did not prove the product's core loop:
ask a useful question, interpret the answer, update state, rerank the catalog,
and improve the recommendation list. Secondary multi-turn cases existed in the
manifest but had no visible selector outside Intent Override.

The previous target treatment also mixed two concepts during Intent Override:
the target could be visible in the labeled public Top-10 before the official
override gate allowed it to count as a hit.

## Decision

Make recommendation impact the primary Step 2 story.

- Buying, Browsing, and Intent Override each expose three official multi-turn
  cases, for nine ranking examples total.
- Every trace displays a turn-by-turn rank journey.
- Every turn reports new, retained, and reordered Top-10 items.
- Every result receives `NEW`, `↑`, `↓`, or `=` movement evidence relative to
  the previous turn.
- The currently selected user answer remains visible beside the rank journey.
- Intent Override labels early target visibility as `Public preview`; only an
  eligible official hit receives `Scored target`.
- Boundary remains an optional edge-case proof, not the ranking centerpiece.

## Primary stories

| Scenario | Trace | Story |
| --- | --- | --- |
| Buying | `public_0018` | Outside Top-10 for two turns; user material answer replaces eight results and moves target to #1 |
| Browsing | `public_0049` | Six-turn exploration progressively rewrites the list; nine new results and target #1 on Turn 6 |
| Intent Override | `public_0003` | Remove old material preference, continue clarification, then replace nine results and reach #1 |

## Acceptance

- Three visible case cards for each core scenario.
- No one-turn trace is used as a core ranking example.
- Rank journey, recommendation delta, and result movement remain visible at
  1440×900 and 1366×768 without page overflow or clipping.
- Tablet reflows without nested vertical scroll areas.
- All evidence remains generated from frozen official-public traces.
