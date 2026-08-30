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
                result = demo.agent.respond(session_id, message, top_k=10)
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
                    }
                )
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
