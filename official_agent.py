from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from shopping_agent import RealWorldShoppingAgent


ALLOWED_ATTRIBUTES = {
    "category",
    "material",
    "color",
    "size",
    "style",
    "brand",
    "budget",
    "feature",
    "use_case",
    "other",
}


class Agent:
    """Adapter from the V1 agent to the official TechJam class contract."""

    def __init__(
        self,
        catalog_path: str | Path = "data/catalog.jsonl",
        *,
        model_endpoint: str | None = None,
        model_name: str = "qwen3-8b",
        model_timeout: float = 30.0,
        intent_backend: str = "hybrid",
        use_reranker: bool = False,
    ) -> None:
        self._agent = RealWorldShoppingAgent(
            catalog_path,
            model_endpoint=model_endpoint,
            model_name=model_name,
            model_timeout=model_timeout,
            intent_backend=intent_backend,
            use_reranker=use_reranker,
        )

    def reset(self, session_id: str, user_profile: dict[str, Any]) -> None:
        if not isinstance(session_id, str) or not session_id.strip():
            raise ValueError("session_id must be a non-empty string")
        if not isinstance(user_profile, dict):
            raise TypeError("user_profile must be a dictionary")
        self._agent.reset(session_id, user_profile)

    def respond(
        self,
        session_id: str,
        user_message: str,
        turn: int,
        top_k: int,
    ) -> dict[str, Any]:
        if not isinstance(turn, int) or isinstance(turn, bool) or not 1 <= turn <= 10:
            raise ValueError("turn must be an integer between 1 and 10")
        if top_k != 10:
            raise ValueError("the official contract requires top_k=10")
        if not isinstance(user_message, str):
            raise TypeError("user_message must be a string")

        result = self._agent.respond(session_id, user_message, top_k=top_k)
        ask_attribute = result.get("ask_attribute")
        if ask_attribute not in ALLOWED_ATTRIBUTES:
            ask_attribute = None

        recommendations: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in result.get("recommendations", []):
            if not isinstance(item, dict):
                continue
            parent_asin = str(item.get("parent_asin", "")).strip()
            if not parent_asin or parent_asin in seen:
                continue
            seen.add(parent_asin)
            recommendation: dict[str, Any] = {"parent_asin": parent_asin}
            score = item.get("score")
            if (
                isinstance(score, (int, float))
                and not isinstance(score, bool)
                and math.isfinite(float(score))
            ):
                recommendation["score"] = float(score)
            recommendations.append(recommendation)
            if len(recommendations) == 10:
                break

        raw_usage = result.get("usage")
        usage = {"prompt_tokens": 0, "completion_tokens": 0}
        if isinstance(raw_usage, dict):
            for key in usage:
                value = raw_usage.get(key)
                if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                    usage[key] = value

        return {
            "message": str(result.get("message", "")),
            "ask_attribute": ask_attribute,
            "recommendations": recommendations,
            "usage": usage,
        }

    def close(self) -> None:
        self._agent.close()
