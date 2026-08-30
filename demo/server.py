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
import html
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
        narrate: bool = False,
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
        # LLM sales-associate narration (DEMO ONLY). When on, the local LLM turns
        # the agent's template reply + real recommendations into a natural,
        # conversational sales pitch and works in the sponsored slot. Falls back to
        # the template if the model is slow/unavailable. Never touches the scored path.
        self.narrate = bool(narrate and model_endpoint)
        self._narrate_endpoint = model_endpoint
        # --- Sponsored-ads simulation (DEMO ONLY, never affects scoring) ---
        # Advertisers "buy" placements keyed by target keywords. When a shopper's
        # category/query matches a live campaign, we surface that product as a
        # clearly-labelled Sponsored slot. This models the article's insight that
        # proactive placement lifts CTR; it never changes the ranked results the
        # scoring path returns.
        self.ad_campaigns: list[dict] = []
        self._seed_demo_campaigns()

    def _pick_ad_product(self, term: str):
        """Pick a catalog product that PLAUSIBLY matches the advertiser's target term.

        Substring LIKE alone grabs nonsense (a tin box whose blurb mentions
        "headphone"). We rank by how prominently the term appears in the title:
        title starting with the term > term as an early word > later mention, and
        only accept a genuinely relevant hit.
        """
        term = (term or "").strip().lower()
        if not term:
            return None
        rows = self.agent.search.connection.execute(
            "SELECT parent_asin, title, store, price FROM products "
            "WHERE lower(title) LIKE ? AND price IS NOT NULL LIMIT 200",
            (f"%{term}%",),
        ).fetchall()
        best, best_rank = None, 1e9
        for asin, title, store, price in rows:
            low = (title or "").lower()
            pos = low.find(term)
            if pos < 0:
                continue
            # earlier = more prominent; strongly prefer term within the first ~25 chars.
            rank = pos + (0 if pos < 25 else 500)
            if rank < best_rank:
                best, best_rank = (asin, title, store, price), rank
        # reject weak matches (term only appears deep in a long title)
        if best is None or best_rank >= 500:
            return None
        return best

    def _new_campaign(self, advertiser, keywords, bid, best, budget=25.0):
        return {
            "id": uuid.uuid4().hex[:8], "advertiser": advertiser,
            "keywords": [k.strip().lower() for k in keywords if k.strip()],
            "bid": float(bid), "active": True,
            "parent_asin": best[0], "title": best[1], "store": best[2], "price": best[3],
            "budget": float(budget), "spend": 0.0,
            "impressions": 0, "clicks": 0,
            "last_relevance": None, "last_ecpm": None,
        }

    def _seed_demo_campaigns(self) -> None:
        seeds = [
            ("Sneaker", ["running", "shoe", "sneaker", "gym", "athletic", "trainer"], "PaceLab", 1.20, 30.0),
            ("Jacket", ["jacket", "coat", "outerwear", "waterproof"], "NorthPeak", 0.95, 25.0),
            ("T-Shirt", ["shirt", "tee", "t-shirt", "cotton", "top"], "PureThread", 0.60, 20.0),
        ]
        for term, keywords, advertiser, bid, budget in seeds:
            best = self._pick_ad_product(term)
            if best:
                self.ad_campaigns.append(self._new_campaign(advertiser, keywords, bid, best, budget))

    def _relevance(self, query_text: str, parent_asin: str) -> float:
        """Real BM25 relevance of an ad product to the user's query, reusing the
        SAME full-text engine the scored path uses (no extra model, no latency spike).
        Returns 0..1. This is the 'relevance' factor of the eCPM auction."""
        import re as _re
        terms = [t for t in _re.findall(r"[a-z0-9]+", (query_text or "").lower()) if len(t) > 1][:24]
        if not terms:
            return 0.0
        expr = " OR ".join('"' + t + '"' for t in terms)
        try:
            row = self.agent.search.connection.execute(
                "SELECT bm25(products, 0.0, 6.0, 4.0, 3.0, 2.0, 2.0, 1.0, 0.0, 0.0) AS b "
                "FROM products WHERE products MATCH ? AND parent_asin = ? LIMIT 1",
                (expr, parent_asin),
            ).fetchone()
        except Exception:
            return 0.0
        if not row or row[0] is None:
            return 0.0
        # bm25() in SQLite is NEGATIVE (more negative = better). Map to 0..1.
        b = float(row[0])
        import math as _m
        return 1.0 / (1.0 + _m.exp(b / 4.0))

    def _auction(self, session_id: str, message: str, top_n: int = 1) -> list[dict]:
        """eCPM auction: eCPM = bid * relevance. Keyword gate + budget + relevance floor;
        rank by eCPM, take top_n. Returns winning campaigns (annotated), highest first."""
        state = self.agent.sessions.get(session_id)
        query_text = " ".join(filter(None, [
            (message or ""),
            (state.category or "") if state else "",
            " ".join(v for vs in (state.hard_constraints.values() if state else []) for v in vs),
            " ".join(v for vs in (state.soft_preferences.values() if state else []) for v in vs),
        ]))
        scored = []
        for c in self.ad_campaigns:
            if not c.get("active") or c.get("spend", 0.0) >= c.get("budget", 0.0):
                continue
            hay = query_text.lower()
            if not any(k in hay for k in c["keywords"]):
                continue
            rel = self._relevance(query_text, c["parent_asin"])
            if rel < 0.15:  # relevance floor: don't show barely-related ads
                continue
            ecpm = c["bid"] * rel
            scored.append((ecpm, rel, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        winners = []
        for ecpm, rel, c in scored[:top_n]:
            c["last_relevance"] = round(rel, 3)
            c["last_ecpm"] = round(ecpm, 4)
            winners.append(c)
        return winners

    def _inject_sponsored(self, session_id: str, message: str, result: dict, top_n: int = 1) -> dict:
        winners = self._auction(session_id, message, top_n=top_n)
        if not winners:
            return result
        recs = list(result.get("recommendations") or [])
        organic_asins = {r.get("parent_asin") for r in recs if isinstance(r, dict)}
        sponsored_slots = []
        for c in winners:
            if c["parent_asin"] in organic_asins:
                continue
            # charge second-price-ish: charge the bid (simple GSP-lite), cap by budget
            charge = min(c["bid"], c["budget"] - c["spend"])
            c["spend"] = round(c.get("spend", 0.0) + charge, 4)
            c["impressions"] = c.get("impressions", 0) + 1
            slot = {
                "parent_asin": c["parent_asin"], "title": c["title"],
                "store": c["store"], "price": c["price"],
                "sponsored": True, "advertiser": c["advertiser"],
                "relevance": c["last_relevance"], "ecpm": c["last_ecpm"],
            }
            sponsored_slots.append(slot)
            organic_asins.add(c["parent_asin"])
        if not sponsored_slots:
            return result
        result["recommendations"] = sponsored_slots + recs
        result["sponsored"] = sponsored_slots[0]
        result["sponsored_slots"] = sponsored_slots
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

    def converse(self, session_id: str, message: str, top_k: int = 10, ad_slots: int = 1) -> dict:
        result = self._converse_inner(session_id, message, top_k)
        result = self._inject_sponsored(session_id, message, result, top_n=ad_slots)
        return self._narrate(message, result)

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
        res = self.agent.respond(session_id, message, top_k=top_k)
        # Demo-only polish: the scoring agent (correctly) returns a terse
        # "not confident enough" line for off-topic / unparseable input. We keep
        # its state/recommendations exactly, but present a friendlier redirect so
        # the demo reads like an assistant. This does NOT change the scored path.
        intent = res.get("intent", {}) or {}
        di = intent.get("domain_intent")
        msg_l = (res.get("message") or "")
        terse = "not confident enough" in msg_l or "还不能确定" in msg_l
        if di == "IRRELEVANT" or terse:
            if has_category:
                res["message"] = (
                    "That's a bit outside what I can help with, but I've kept your "
                    "shopping in progress. Tell me another preference and I'll refine, "
                    "or say 'just recommend something'."
                    if en else
                    "这个我帮不上忙，不过你的购物进度我保留着。告诉我别的偏好我就继续筛，"
                    "或者直接说“你推荐吧”。"
                )
            else:
                res["message"] = (
                    "I'm best at finding products. Tell me a category and any "
                    "preferences — or say 'just recommend something' and I'll start."
                    if en else
                    "我最擅长帮你找商品。告诉我一个品类加上偏好——或者直接说“你推荐吧”，"
                    "我就开始。"
                )
        return res

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

    def _narrate(self, user_message: str, result: dict) -> dict:
        """Rewrite the template reply as a natural sales-associate pitch via the LLM.
        DEMO ONLY. Falls back to the original template on any failure/slowness."""
        if not self.narrate:
            return result
        import urllib.request
        recs = (result.get("recommendations") or [])[:3]
        if not recs:
            return result
        en = self._is_en(user_message)
        lines = []
        for i, r in enumerate(recs, 1):
            tag = " [Sponsored]" if r.get("sponsored") else ""
            price = (" $" + str(r["price"])) if r.get("price") is not None else ""
            lines.append(str(i) + ". " + (r.get("title") or "")[:70] + price + tag)
        catalog_view = "\n".join(lines)
        sys_prompt = (
            "You are a warm, concise in-store shopping associate. Given the user's "
            "message and a ranked shortlist the search engine already returned, write "
            "a SHORT reply (2-3 sentences) that: acknowledges what they want, highlights "
            "1-2 picks by name with a concrete reason, and if a [Sponsored] item is "
            "present, mention it naturally as a suggestion (never fabricate facts, "
            "prices, or discounts). Do not invent products beyond the shortlist. "
            + ("Reply in English." if en else "\u7528\u4e2d\u6587\u56de\u590d\u3002")
        )
        user_content = ("User said: " + user_message + "\nShortlist:\n" + catalog_view
                        + "\nTemplate hint (context only): " + str(result.get("message", "")))
        payload = {
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_content},
            ],
            "max_tokens": 220,
            "enable_thinking": False,
        }
        try:
            req = urllib.request.Request(
                self._narrate_endpoint, data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"})
            data = json.load(urllib.request.urlopen(req, timeout=25))
            text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
            if text:
                result["message"] = text
                result["narrated"] = True
        except Exception:
            pass  # keep the template reply
        return result


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

        def _send_markdown_page(self, path: Path, title: str):
            content = html.escape(path.read_text(encoding="utf-8"))
            body = (
                "<!doctype html><html><head><meta charset='utf-8'>"
                f"<title>{html.escape(title)}</title>"
                "<style>body{margin:0;background:#0d1117;color:#e6edf3;"
                "font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}"
                "main{max-width:1100px;margin:auto;padding:32px}"
                "a{color:#58a6ff}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>"
                f"</head><body><main><a href='/'>← Tour</a><pre>{content}</pre></main></body></html>"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            # --- Judge-facing demo: tour is the default entry ---
            if self.path in ("/", "/tour", "/tour.html"):
                tour = _STATIC / "tour.html"
                if tour.is_file():
                    return self._send_file(tour, "text/html; charset=utf-8")
                # Fallback to old index if tour not yet built
                return self._send_file(_STATIC / "index.html", "text/html; charset=utf-8")
            if self.path == "/tour.js":
                return self._send_file(_STATIC / "tour.js", "application/javascript")
            if self.path == "/tour.css":
                return self._send_file(_STATIC / "tour.css", "text/css")
            if self.path == "/evidence":
                tour = _STATIC / "tour.html"
                if tour.is_file():
                    return self._send_file(tour, "text/html; charset=utf-8")
            if self.path == "/report":
                return self._send_markdown_page(_REPO_ROOT / "REPORT.md", "Technical Report")
            if self.path == "/reproduce":
                return self._send_markdown_page(_REPO_ROOT / "README.md", "Reproduction Instructions")
            # --- Evidence JSON (frozen, read-only) ---
            if self.path.startswith("/evidence/"):
                evidence_dir = _STATIC.parent / "evidence"
                # /evidence/scenarios/public_0001.json etc.
                rel = self.path[len("/evidence/"):]
                if rel and not (".." in rel):
                    fpath = evidence_dir / rel
                    if fpath.is_file() and fpath.suffix == ".json":
                        return self._send_file(fpath, "application/json")
                # /evidence -> evidence explorer page (fallback to tour for now)
                if not rel or rel in ("", "index.html"):
                    tour = _STATIC / "tour.html"
                    if tour.is_file():
                        return self._send_file(tour, "text/html; charset=utf-8")
            # --- Sandbox (old chat UI) ---
            if self.path in ("/sandbox", "/sandbox.html", "/index.html"):
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
                            "relevance": item.get("relevance"),
                            "ecpm": item.get("ecpm"),
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
                        "sponsored_slots": result.get("sponsored_slots"),
                        "narrated": bool(result.get("narrated")),
                    }
                )
            if self.path == "/api/ads":
                # Create a new demo campaign. Advertiser targets keywords with a bid.
                title_like = str(payload.get("target", "")).strip()
                row = demo._pick_ad_product(title_like) if title_like else None
                if not row:
                    return self._send_json(
                        {"error": f"no clearly-matching catalog product for target '{title_like}'. "
                                  "Try a term that appears in product titles, e.g. jacket, sneaker, hoodie, watch, bag."},
                        400,
                    )
                campaign = demo._new_campaign(
                    str(payload.get("advertiser", "DemoBrand"))[:40],
                    str(payload.get("keywords", title_like)).split(","),
                    float(payload.get("bid", 0.5)),
                    row,
                    budget=float(payload.get("budget", 25.0)),
                )
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
    parser.add_argument("--narrate", action="store_true",
                        default=os.environ.get("DEMO_NARRATE", "").lower() in ("1", "true", "yes"),
                        help="LLM sales-associate narration of replies (demo only; needs --model-endpoint)")
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
        narrate=args.narrate,
    )
    print(f"Intent backend: {args.intent_backend}"
          + (f" (LLM @ {args.model_endpoint})" if args.model_endpoint else " (offline rules)")
          + (" · LLM narration ON" if (args.narrate and args.model_endpoint) else ""),
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
