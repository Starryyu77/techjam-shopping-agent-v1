# Demo Walkthrough — TikTok Shop · Shopping Copilot

A 3-minute self-guided tour of the live demo. Open **http://127.0.0.1:8000**.

> The demo layer (conversation polish, LLM sales-associate narration, sponsored-ad
> engine, dashboards) is entirely separate from the **scored path**. The official
> evaluator only ever calls the deterministic rules engine, which reproduces
> **TechnicalScore = 0.8665** bit-for-bit. Nothing here changes that number.

---

## Station 1 — Shopper view (the core)

1. Click **New session** (top right).
2. Type (or click a "Try:" chip). Suggested sequence:

   | Type this | What to watch |
   |---|---|
   | `I need breathable running shoes under 80 dollars` | Right panel extracts **category=running shoes, budget=80, feature=breathable** in real time. Left shows an **AI ASSOCIATE** reply (Qwen3-generated; a "thinking…" animation runs ~2–3s). The #1 rec is a **PROMOTED** slot with **relevance%** and **eCPM$**. |
   | `Saw a creator wearing an oversized hoodie, want something similar` | TikTok content-to-commerce (种草) → finds similar hoodies. |
   | `Actually forget cotton — I want something waterproof` | Detects **override** and rewrites the preference (doesn't just append). |
   | `Any discount codes?` | Boundary safety: refuses to invent a coupon. |
   | `I don't know, just recommend me something` | Fallback: recommends immediately instead of stalling. |

3. Watch three things: the **AI-associate reply** (names products + reasons), the
   **"How the Copilot understands you"** panel (live intent/constraints), and the
   **Promoted** slot badge (relevance + eCPM).

## Station 2 — Ad Console  (top-right "Ad Console")

Play the advertiser:

1. In **New Campaign**: Advertiser `MyBrand`, Target product `hoodie`,
   Keywords `hoodie, sweatshirt`, Bid `3.00`, Daily Budget `20`.
2. Click **Launch campaign** — it appears in **Live Campaigns**.
3. Go back to **Shopper view**, New session, type `looking for a hoodie` —
   **your campaign wins the auction and appears as the Promoted slot.**
4. Return to Ad Console: your campaign's **Impr.** and **Spend** have ticked up
   (auto-refresh every 3s).

**Prove relevance beats raw bid:** launch two campaigns both keyed to `jacket` —
one Target `jacket` Bid 1.0, one Target `watch` Bid 5.0. Search `jacket` in the
shopper view: the **lower-bid but relevant** campaign wins, because
**eCPM = bid × relevance**.

## Station 3 — Dashboard  (top-right "Dashboard")

KPI cards (total spend, remaining budget, avg relevance) and a campaigns-by-spend
table with live progress bars, refreshing every 3s — the numbers move as you shop.

---

## What's real vs simulated (be transparent with judges)

- **Real:** the deterministic retrieval/ranking (the scored engine), the BM25
  relevance used in the ad auction (same FTS5 engine), the Qwen3 intent parsing
  and sales-associate narration (local, loopback).
- **Simulated for the demo:** the sponsored-inventory catalog and advertiser
  budgets/bids (there is no real ad marketplace). Clearly labelled "Promoted".
- **Never touched:** organic ranking and the official score.
