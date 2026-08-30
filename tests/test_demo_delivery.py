"""Delivery-contract tests for the judge-facing demo."""
from __future__ import annotations

import threading
import unittest
import urllib.error
import urllib.request
from http.server import HTTPServer
from pathlib import Path

from demo.server import make_handler


_REPO_ROOT = Path(__file__).resolve().parent.parent


class DemoRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), make_handler(object()))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def _get(self, path: str) -> tuple[int, str]:
        try:
            with urllib.request.urlopen(self.base + path, timeout=3) as response:
                return response.status, response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read().decode("utf-8")

    def test_evidence_route_is_not_broken(self):
        status, body = self._get("/evidence")
        self.assertEqual(status, 200)
        self.assertIn("Shopping Copilot", body)

    def test_report_route_serves_the_technical_report(self):
        status, body = self._get("/report")
        self.assertEqual(status, 200)
        self.assertIn("Technical Report", body)

    def test_reproduce_route_serves_readme(self):
        status, body = self._get("/reproduce")
        self.assertEqual(status, 200)
        self.assertIn("Conversational Shopping Copilot", body)


class TourDeliveryMarkupTests(unittest.TestCase):
    def setUp(self):
        self.html = (_REPO_ROOT / "demo" / "static" / "tour.html").read_text(encoding="utf-8")
        self.js = (_REPO_ROOT / "demo" / "static" / "tour.js").read_text(encoding="utf-8")

    def test_closeout_internal_links_are_real_routes(self):
        self.assertIn('href="/report" id="linkReport"', self.html)
        self.assertIn('href="/reproduce" id="linkReproduce"', self.html)
        self.assertNotIn('href="#" id="linkReport"', self.html)
        self.assertNotIn('href="#" id="linkReproduce"', self.html)

    def test_tour_uses_frozen_canonical_cases(self):
        self.assertIn("manifest.canonical_cases", self.js)
        self.assertNotIn("Prefer multi-turn cases for richer visual", self.js)

    def test_ad_invariant_renders_actual_before_and_after_lists(self):
        self.assertIn('id="organicBeforeList"', self.html)
        self.assertIn('id="organicAfterList"', self.html)
        self.assertIn("organicBefore", self.js)
        self.assertIn("organicAfter", self.js)


if __name__ == "__main__":
    unittest.main()
