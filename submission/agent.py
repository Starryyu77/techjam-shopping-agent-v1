"""Official TechJam submission entry point.

Exports `Agent` implementing the required contract:
    Agent.reset(session_id, user_profile) -> None
    Agent.respond(session_id, user_message, turn, top_k) -> dict

The agent runs fully offline on CPU using deterministic rules + SQLite FTS5.
No network access, no API keys, and no live model service are required for
official scoring. An optional local cross-encoder reranker and an optional
localhost Qwen intent layer exist for development, but the submitted default
is the rules-only pipeline that produced the reported public-set scores.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

# Make the repository root importable whether run from repo root or submission/.
_REPO_ROOT = Path(__file__).resolve().parent.parent
import sys

if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from official_agent import Agent as _OfficialAgent


_DEFAULT_CATALOG = "data/catalog.jsonl"


def _resolve_catalog(catalog_path: str | Path | None) -> Path:
    # An explicit non-default path always wins.
    if catalog_path is not None and str(catalog_path) != _DEFAULT_CATALOG:
        return Path(catalog_path)
    # Otherwise prefer an env override, then known local locations.
    env = os.environ.get("TECHJAM_CATALOG")
    if env:
        return Path(env)
    for candidate in (
        _REPO_ROOT.parent / "techjam-conversational-search" / "data" / "catalog.jsonl",
        Path(_DEFAULT_CATALOG),
    ):
        if candidate.is_file():
            return candidate
    return Path(_DEFAULT_CATALOG)


class Agent(_OfficialAgent):
    """Rules-only, offline-by-default shopping agent for official scoring."""

    def __init__(self, catalog_path: str | Path = "data/catalog.jsonl", **kwargs: Any) -> None:
        resolved = _resolve_catalog(kwargs.pop("catalog_path", None) or catalog_path)  # noqa: E501
        # Default to the deterministic offline path. Development flags
        # (intent_backend='hybrid'/'model', use_reranker=True) remain available
        # via kwargs but are OFF for official scoring.
        kwargs.setdefault("intent_backend", "rules")
        kwargs.setdefault("use_reranker", False)
        super().__init__(resolved, **kwargs)
