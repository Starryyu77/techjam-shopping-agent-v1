"""Deterministic scripted walkthrough of the shopping agent (offline, rules).

Produces a clean, narratable transcript demonstrating all four scenario types and
the internal state transitions. Useful as reproducible evidence and as a
narration track for the demo video. No network, no model.

Run:
    TECHJAM_CATALOG=/path/to/catalog.jsonl python demo/walkthrough.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from shopping_copilot.shopping_agent import RealWorldShoppingAgent


def _catalog() -> Path:
    env = os.environ.get("TECHJAM_CATALOG")
    if env:
        return Path(env)
    sib = _REPO_ROOT.parent / "techjam-conversational-search" / "data" / "catalog.jsonl"
    return sib


SCENARIOS = [
    (
        "BUYING — concrete constraints, lock and narrow",
        {"preference_tags": ["material", "fit"], "summary": "buys shoes a few times a year"},
        [
            "I'm looking for running shoes, must be breathable",
            "not cotton, budget under 80 dollars",
            "For that, what matters is: black.",
        ],
    ),
    (
        "BROWSING — vague start, clarify before filtering",
        {"preference_tags": ["style"], "summary": "casual browser"},
        [
            "I'm looking for a jacket, but I'm still exploring.",
            "For that, what matters is: waterproof.",
            "For that, what matters is: fleece.",
        ],
    ),
    (
        "INTENT OVERRIDE — erase & rewrite mid-conversation",
        {"preference_tags": ["material"], "summary": "changes mind often"},
        [
            "I'm looking for a handbag. I prefer leather.",
            "Actually, ignore my earlier preference. What I need is: canvas.",
            "For that, what matters is: crossbody.",
        ],
    ),
    (
        "BOUNDARY — off-topic / coupon question, do not pollute state",
        {"preference_tags": [], "summary": "asks tangential questions"},
        [
            "I'm looking for a scarf, must be wool.",
            "Is there a coupon for this?",
            "What's the weather tomorrow?",
        ],
    ),
]


def _fmt_state(state) -> str:
    d = state.to_dict()
    parts = []
    if d["category"]:
        parts.append(f"category={d['category']}")
    if d["hard_constraints"]:
        parts.append(f"hard={d['hard_constraints']}")
    if d["soft_preferences"]:
        parts.append(f"soft={d['soft_preferences']}")
    if d["negative_constraints"]:
        parts.append(f"neg={d['negative_constraints']}")
    return " | ".join(parts) or "(empty)"


def main() -> None:
    catalog = _catalog()
    if not catalog.is_file():
        raise SystemExit(f"catalog not found: {catalog} (set TECHJAM_CATALOG)")
    print(f"Loading 50k catalog into in-memory FTS5 from {catalog} ...\n")
    agent = RealWorldShoppingAgent(str(catalog), intent_backend="rules")
    try:
        for title, profile, messages in SCENARIOS:
            print("=" * 78)
            print(title)
            print("=" * 78)
            sid = f"walk_{abs(hash(title)) % 10000}"
            agent.reset(sid, profile)
            for i, msg in enumerate(messages, 1):
                resp = agent.respond(sid, msg, top_k=10)
                state = agent.sessions[sid]
                recs = resp.get("recommendations", [])[:3]
                titles = []
                for r in recs:
                    row = agent.search.connection.execute(
                        "SELECT title FROM products WHERE parent_asin=? LIMIT 1",
                        (r["parent_asin"],),
                    ).fetchone()
                    titles.append((row[0][:40] if row and row[0] else r["parent_asin"]))
                print(f"\n  USER   : {msg}")
                print(f"  AGENT  : {resp.get('message','')[:90]}")
                if resp.get("ask_attribute"):
                    print(f"  ASK    : {resp['ask_attribute']}")
                print(f"  STATE  : {_fmt_state(state)}")
                print(f"  TOP-3  : {titles}")
            print()
    finally:
        agent.close()


if __name__ == "__main__":
    main()
