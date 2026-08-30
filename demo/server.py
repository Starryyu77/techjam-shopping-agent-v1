"""Offline demo server for the conversational shopping agent.

Stdlib-only HTTP server (no third-party deps) that wraps the existing agent and
exposes its INTERNAL dialogue state so the front-end can visualize the state
machine live: hard / soft / negative slots, intent-override rewrites, candidate
pool, current strategy, and top recommendations.

The agent's official interface is untouched; this is a pure presentation layer.

Run:
    TECHJAM_CATALOG=/path/to/catalog.jsonl python demo/server.py --port 8000
then open http://127.0.0.1:8000
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from shopping_agent import RealWorldShoppingAgent  # noqa: E402

_STATIC = Path(__file__).resolve().parent / "static"


def _resolve_catalog(cli: str | None) -> Path:
    if cli:
        return Path(cli)
    env = os.environ.get("TECHJAM_CATALOG")
    if env:
        return Path(env)
    sibling = _REPO_ROOT.parent / "techjam-conversational-search" / "data" / "catalog.jsonl"
    if sibling.is_file():
        return sibling
    return Path("data") / "catalog.jsonl"


class DemoState:
    def __init__(
        self,
        catalog: Path,
        *,
        intent_backend: str = "rules",
        model_endpoint: str | None = None,
        model_name: str = "qwen3-8b",
    ) -> None:
        # Default: rules backend keeps the demo fully offline and deterministic.
        # Optional: intent_backend="hybrid" + model_endpoint enables the local LLM
        # intent layer for open natural language. HybridIntentParser degrades to
        # rules automatically if the model is unavailable, so the demo never breaks.
        self.agent = RealWorldShoppingAgent(
            str(catalog),
            intent_backend=intent_backend,
            model_endpoint=model_endpoint,
            model_name=model_name,
        )
        self.intent_backend = intent_backend
        self.model_endpoint = model_endpoint
        # --- Sponsored-ads simulation (DEMO ONLY, never affects scoring) ---
        # Advertisers "buy" placements keyed by target keywords. When a shopper's
        # category/query matches a live campaign, we surface that product as a
        # clearly-labelled Sponsored slot. This models the article's insight that
        # proactive placement lifts CTR; it never changes the ranked results the
        # scoring path returns.
        self.ad_campaigns: list[dict] = []
        self._seed_demo_campaigns()

    def _seed_demo_campaigns(self) -> None:
        # Pull a few real catalog products to act as demo "sponsored" inventory.
        seeds = [
            ("running shoes", ["running", "shoe", "sneaker", "gym", "athletic"]),
            ("jacket", ["jacket", "coat", "outerwear", "waterproof"]),
            ("t-shirt", ["shirt", "tee", "t-shirt", "cotton"]),
        ]
        for label, keywords in seeds:
            row = self.agent.search.connection.execute(
                "SELECT parent_asin, title, store, price FROM products "
                "WHERE lower(title) LIKE ? AND price IS NOT NULL ORDER BY price LIMIT 1",
                (f"%{label.split()[0]}%",),
            ).fetchone()
            if row:
                self.ad_campaigns.append({
                    "id": uuid.uuid4().hex[:8],
                    "advertiser": {"running shoes": "PaceLab", "jacket": "NorthPeak",
                                   "t-shirt": "PureThread"}.get(label, "BrandX"),
                    "keywords": keywords,
                    "bid": {"running shoes": 1.20, "jacket": 0.95, "t-shirt": 0.60}.get(label, 0.50),
                    "active": True,
                    "parent_asin": row[0], "title": row[1], "store": row[2], "price": row[3],
                    "impressions": 0,
                })

    def _match_campaign(self, session_id: str, message: str) -> dict | None:
        state = self.agent.sessions.get(session_id)
        hay = " ".join(filter(None, [
            (message or "").lower(),
            (state.category or "").lower() if state else "",
        ]))
        best, best_bid = None, -1.0
        for c in self.ad_campaigns:
            if not c.get("active"):
                continue
            if any(k in hay for k in c["keywords"]) and c["bid"] > best_bid:
                best, best_bid = c, c["bid"]
        return best

    def _inject_sponsored(self, result: dict, campaign: dict | None) -> dict:
        if not campaign:
            return result
        recs = result.get("recommendations") or []
        # Don't duplicate if it's already organically present.
        if any((r.get("parent_asin") == campaign["parent_asin"]) for r in recs if isinstance(r, dict)):
            return result
        campaign["impressions"] = campaign.get("impressions", 0) + 1
        sponsored = {
            "parent_asin": campaign["parent_asin"],
            "title": campaign["title"],
            "store": campaign["store"],
            "price": campaign["price"],
            "sponsored": True,
            "advertiser": campaign["advertiser"],
        }
        result["recommendations"] = [sponsored] + list(recs)
        result["sponsored"] = sponsored
        return result

    def title_of(self, asin: str) -> str:
        row = self.agent.search.connection.execute(
            "SELECT title FROM products WHERE parent_asin = ? LIMIT 1", (asin,)
        ).fetchone()
        return str(row[0]) if row and row[0] else asin

    def snapshot(self, session_id: str) -> dict:
        state = self.agent.sessions.get(session_id)
        return state.to_dict() if state else {}

    def candidate_count(self, session_id: str) -> int:
        return len(self.agent.last_results.get(session_id, []))

    # ---- Conversational layer (DEMO ONLY) ---------------------------------
    # The scoring path calls agent.respond() directly and never touches this.
    # Here we make the demo feel like a real chat assistant: it fields small-talk
    # and "just recommend something" requests instead of falling back to the
    # terse "I am not confident enough..." reply, and delegates any genuine
    # shopping message to the UNCHANGED agent.respond().
    _CHITCHAT = re.compile(
        r"\b(what can you do|who are you|what are you|how do you work|help me|"
        r"how can you help|what do you do|can you help)\b|你能(做什么|干(什么|嘛|啥))|"
        r"你是(谁|什么)|你怎么(用|工作)|你能帮我(什么|啥)",
        re.IGNORECASE,
    )
    _FALLBACK = re.compile(
        r"\b(i (really )?(don'?t|do not) know|not sure|no idea|you (decide|choose|pick)|"
        r"(any|some) (recommendations?|suggestions?|ideas?)|surprise me|whatever|"
        r"just (recommend|suggest|show)|up to you)\b|"
        r"(我|都)?(不|没)(知道|清楚)|你(帮我)?(决定|推荐|挑|选)|随便|都行|看你的",
        re.IGNORECASE,
    )

    def _is_en(self, msg: str) -> bool:
        return not re.search(r"[\u4e00-\u9fff]", msg)

    def converse(self, session_id: str, message: str, top_k: int = 10) -> dict:
        result = self._converse_inner(session_id, message, top_k)
        return self._inject_sponsored(result, self._match_campaign(session_id, message))

    def _converse_inner(self, session_id: str, message: str, top_k: int = 10) -> dict:
        msg = (message or "").strip()
        en = self._is_en(msg)
        state = self.agent.sessions.get(session_id)
        has_category = bool(state and state.category)

        # 1) Small-talk / capability question -> introduce, don't parse as shopping.
        if msg and self._CHITCHAT.search(msg) and not has_category:
            text = (
                "I'm a shopping assistant. Tell me what you're looking for in plain "
                "language — a category and any preferences (material, color, size, "
                "budget, use case) — and I'll narrow a 50k-product catalog to the best "
                "matches. You can also say \"I don't know, just recommend something\"."
                if en else
                "我是一个购物助手。用大白话告诉我你想买什么——品类加上任何偏好（材质、"
                "颜色、尺寸、预算、用途），我会从 5 万件商品里帮你筛出最合适的。你也可以"
                "直接说“我也不知道，你推荐吧”。"
            )
            return self._chat_reply(session_id, "chitchat", text, top_k)

        # 2) "Just recommend something" -> recommend now instead of asking to rephrase.
        if msg and self._FALLBACK.search(msg):
            if has_category:
                # Nudge the agent to surface current candidates without new constraints.
                res = self.agent.respond(session_id, "show me your recommendations", top_k=top_k)
                res["message"] = (
                    "Sure — here are my top picks for what you've told me so far. "
                    "Tell me any preference to refine them."
                    if en else
                    "好的——这是根据你目前的需求给出的推荐。告诉我任何偏好我就能进一步筛选。"
                ) + " " + res.get("message", "")
                return res
            text = (
                "No problem — what kind of product are we talking about? Even a rough "
                "category like \"a jacket\", \"running shoes\", or \"a gift for my mom\" "
                "is enough for me to start."
                if en else
                "没问题——我们先定个大方向，你想买哪一类东西？哪怕只说“一件夹克”“跑鞋”"
                "或“给妈妈的礼物”，我就能开始帮你找。"
            )
            return self._chat_reply(session_id, "clarify", text, top_k)

        # 3) Genuine shopping message -> the UNCHANGED scoring agent.
        return self.agent.respond(session_id, message, top_k=top_k)

    def _chat_reply(self, session_id: str, act: str, text: str, top_k: int) -> dict:
        prev = self.agent.last_results.get(session_id, [])
        recs = [{"parent_asin": c.parent_asin, "title": c.title,
                 "price": getattr(c, "price", None), "store": getattr(c, "store", None)}
                for c in prev[:top_k]]
        return {
            "message": text,
            "ask_attribute": None,
            "recommendations": recs,
            "intent": {"domain_intent": "CHAT", "dialogue_act": act, "confidence": 1.0},
        }


def make_handler(demo: DemoState):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # quiet
            pass

        def _send_json(self, obj, code=200):
            body = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_file(self, path: Path, ctype: str):
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path in ("/", "/index.html"):
                return self._send_file(_STATIC / "index.html", "text/html; charset=utf-8")
            if self.path == "/app.js":
                return self._send_file(_STATIC / "app.js", "application/javascript")
            if self.path == "/style.css":
                return self._send_file(_STATIC / "style.css", "text/css")
            if self.path in ("/dashboard", "/dashboard.html"):
                dash = _STATIC / "dashboard.html"
                if dash.is_file():
                    return self._send_file(dash, "text/html; charset=utf-8")
            if self.path in ("/ads", "/ads.html"):
                ads = _STATIC / "ads.html"
                if ads.is_file():
                    return self._send_file(ads, "text/html; charset=utf-8")
            if self.path == "/api/ads":
                return self._send_json({"campaigns": demo.ad_campaigns})
            self._send_json({"error": "not found"}, 404)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/api/reset":
                session_id = f"demo_{uuid.uuid4().hex[:12]}"
                profile = payload.get("user_profile") or {}
                demo.agent.reset(session_id, profile)
                return self._send_json({"session_id": session_id, "state": demo.snapshot(session_id)})
            if self.path == "/api/respond":
                session_id = payload["session_id"]
                message = payload.get("message", "")
                turn = int(payload.get("turn", 1))
                result = demo.converse(session_id, message, top_k=10)
                recs = []
                for item in result.get("recommendations", [])[:10]:
                    if not isinstance(item, dict):
                        asin = str(item)
                        recs.append({"parent_asin": asin, "title": demo.title_of(asin)})
                        continue
                    asin = item.get("parent_asin")
                    if not asin:
                        continue
                    recs.append(
                        {
                            "parent_asin": asin,
                            "title": item.get("title") or demo.title_of(asin),
                            "price": item.get("price"),
                            "store": item.get("store"),
                            "score": item.get("score"),
                            "reasons": item.get("reasons", [])[:3],
                            "sponsored": bool(item.get("sponsored")),
                            "advertiser": item.get("advertiser"),
                        }
                    )
                state = demo.snapshot(session_id)
                intent = result.get("intent", {}) or {}
                return self._send_json(
                    {
                        "message": result.get("message", ""),
                        "ask_attribute": result.get("ask_attribute"),
                        "recommendations": recs,
                        "state": state,
                        "candidate_count": demo.candidate_count(session_id),
                        "turn": min(turn, 10),
                        "intent": {
                            "domain_intent": intent.get("domain_intent"),
                            "dialogue_act": intent.get("dialogue_act"),
                            "confidence": intent.get("confidence"),
                        },
                        "sponsored": result.get("sponsored"),
                    }
                )
            if self.path == "/api/ads":
                # Create a new demo campaign. Advertiser targets keywords with a bid.
                title_like = str(payload.get("target", "")).strip()
                row = demo.agent.search.connection.execute(
                    "SELECT parent_asin, title, store, price FROM products "
                    "WHERE lower(title) LIKE ? AND price IS NOT NULL ORDER BY price LIMIT 1",
                    (f"%{title_like.lower()}%",),
                ).fetchone() if title_like else None
                if not row:
                    return self._send_json({"error": "no catalog product matched target"}, 400)
                campaign = {
                    "id": uuid.uuid4().hex[:8],
                    "advertiser": str(payload.get("advertiser", "DemoBrand"))[:40],
                    "keywords": [k.strip().lower() for k in
                                 str(payload.get("keywords", title_like)).split(",") if k.strip()],
                    "bid": float(payload.get("bid", 0.5)),
                    "active": True,
                    "parent_asin": row[0], "title": row[1], "store": row[2], "price": row[3],
                    "impressions": 0,
                }
                demo.ad_campaigns.append(campaign)
                return self._send_json({"campaign": campaign})
            if self.path == "/api/ads/toggle":
                cid = payload.get("id")
                for c in demo.ad_campaigns:
                    if c["id"] == cid:
                        c["active"] = not c.get("active", True)
                        return self._send_json({"campaign": c})
                return self._send_json({"error": "campaign not found"}, 404)
            self._send_json({"error": "not found"}, 404)

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description="Shopping agent demo server (offline)")
    parser.add_argument("--catalog", default=None)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--intent-backend", default=os.environ.get("DEMO_INTENT_BACKEND", "rules"),
                        choices=["rules", "hybrid", "model"],
                        help="rules (offline default) | hybrid (rules + LLM fallback) | model")
    parser.add_argument("--model-endpoint", default=os.environ.get("DEMO_MODEL_ENDPOINT"),
                        help="localhost OpenAI-compatible endpoint, e.g. http://127.0.0.1:8100/v1/chat/completions")
    parser.add_argument("--model-name", default=os.environ.get("DEMO_MODEL_NAME", "qwen3-8b"))
    args = parser.parse_args()
    catalog = _resolve_catalog(args.catalog)
    if not catalog.is_file():
        raise SystemExit(f"catalog not found: {catalog} (set --catalog or TECHJAM_CATALOG)")
    print(f"Loading catalog {catalog} ...", flush=True)
    demo = DemoState(
        catalog,
        intent_backend=args.intent_backend,
        model_endpoint=args.model_endpoint,
        model_name=args.model_name,
    )
    print(f"Intent backend: {args.intent_backend}"
          + (f" (LLM @ {args.model_endpoint})" if args.model_endpoint else " (offline rules)"),
          flush=True)
    # Single-threaded: the in-memory SQLite connection is thread-affine, and a
    # demo needs no concurrency. Requests are serialized, which is fine here.
    server = HTTPServer((args.host, args.port), make_handler(demo))
    print(f"Demo running at http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        demo.agent.close()


if __name__ == "__main__":
    main()
