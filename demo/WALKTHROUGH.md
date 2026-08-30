# Guided Evidence Tour Walkthrough

[English README](../README.md) | [中文 README](../README.zh-CN.md)

- Public Tour: https://shopping-copilot-techjam.pages.dev/
- Local Tour: `python demo/server.py --port 8000`, then open `http://127.0.0.1:8000`

The default page is a deterministic evidence walkthrough. It does not require
typing and does not call the optional Qwen model.

## Step 0 — Results

Confirm the Hero shows:

- TechnicalScore 0.8665
- HitRate@10 0.995
- MRR 0.644
- MTTC 2.215
- `Official public evaluator · 200 sessions`
- `Private 800-session performance remains unknown`

## Step 1 — Data Contract

Confirm the page shows the frozen 50,000-product catalog, 200 public sessions,
800 private sessions, a ten-turn limit, `parent_asin`, read-only status, scenario
mix, and real text-only catalog metadata.

## Step 2 — Scenario Replay

Use the four scenario tabs:

| Tab | Canonical evidence | What to inspect |
| --- | --- | --- |
| Buying | `public_0030` | `material=polyester`, target Rank #1 |
| Browsing | `public_0063` | clarification narrows a vague request |
| Intent Override | `public_0004` | one removed slot, one added slot, target Rank #1 |
| Boundary | `public_0050` | no-preference handling without state loss |

Use Prev, Next, Auto, and Restart to move through a trace. Target labels are
visible because these are labeled public sessions.

## Step 3 — Mechanism

Expand the four mechanism cards:

1. Dual-track routing
2. Erase-and-rewrite state machine
3. Candidate-driven clarification
4. Banded popularity tiebreaker

Read `Experiments We Did Not Ship` for the cross-encoder and prompt-evolution
negative results.

## Step 4 — Evaluation

Confirm the version table uses the official weak starter source:

| System | HitRate@10 | MRR | MTTC | TechnicalScore |
| --- | ---: | ---: | ---: | ---: |
| Official weak BM25 starter | 0.125 | 0.068 | 9.810 | 0.1067 |
| Rules V1.3 | 0.995 | 0.644 | 2.215 | 0.8665 |

The page must say `Not hidden-set evidence` and show the report hash, Agent
commit, generation timestamp, and reproduction command.

## Step 5 — Transparent Ads

This step is purple and marked `Demo Only`. Click `Run Auction` and verify:

- Campaign A wins through relevance, not raw bid.
- Campaign B is below the relevance floor.
- The before/after organic `parent_asin` lists remain identical.
- The page does not claim clicks, conversions, CTR, or GMV.

## Step 6 — Closeout

Check the public repository, Technical Report, Reproduction Instructions,
limitations, team contributions, and private-800 boundary.

## Optional sandbox

`/sandbox` keeps the old free-form chat for local exploration. It is not part of
the public static deployment, the main video, or official evaluator evidence.
