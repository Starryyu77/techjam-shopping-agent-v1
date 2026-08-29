"""Local cross-encoder reranker (offline, bundled model, graceful fallback).

This module provides a semantic reranking signal on top of the FTS5 + rule
pipeline. It is intentionally dependency-light and degrades to a no-op when
torch or the bundled model is unavailable, so the agent still runs on a
CPU-only, network-disabled scoring host with rules alone.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Sequence


_DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "models" / "ms-marco-MiniLM-L-6-v2"


class CrossEncoderReranker:
    """Wraps a bundled MiniLM cross-encoder. No-op if unavailable."""

    def __init__(
        self,
        model_dir: str | Path = _DEFAULT_MODEL_DIR,
        *,
        max_length: int = 192,
        batch_size: int = 64,
        device: str | None = None,
    ) -> None:
        self.model_dir = Path(model_dir)
        self.max_length = max_length
        self.batch_size = batch_size
        self._ok = False
        self._tok = None
        self._model = None
        self._torch = None
        self._device = device
        self._load()

    def _load(self) -> None:
        try:
            import torch  # type: ignore
            from transformers import (  # type: ignore
                AutoModelForSequenceClassification,
                AutoTokenizer,
            )
        except Exception:
            return
        if not self.model_dir.is_dir():
            return
        try:
            self._tok = AutoTokenizer.from_pretrained(str(self.model_dir))
            self._model = AutoModelForSequenceClassification.from_pretrained(
                str(self.model_dir)
            )
            if self._device is None:
                if torch.backends.mps.is_available():
                    self._device = "mps"
                elif torch.cuda.is_available():
                    self._device = "cuda"
                else:
                    self._device = "cpu"
            self._model = self._model.to(self._device).eval()
            self._torch = torch
            self._ok = True
        except Exception:
            self._ok = False

    @property
    def available(self) -> bool:
        return self._ok

    def score(self, query: str, documents: Sequence[str]) -> list[float]:
        """Return a relevance score per document (higher = better).

        Returns an empty list when the model is unavailable so callers can
        fall back to the rule score cleanly.
        """
        if not self._ok or not documents:
            return []
        torch = self._torch
        scores: list[float] = []
        try:
            with torch.no_grad():
                for start in range(0, len(documents), self.batch_size):
                    chunk = documents[start : start + self.batch_size]
                    enc = self._tok(
                        [query] * len(chunk),
                        list(chunk),
                        padding=True,
                        truncation=True,
                        max_length=self.max_length,
                        return_tensors="pt",
                    ).to(self._device)
                    logits = self._model(**enc).logits.squeeze(-1)
                    scores.extend(logits.detach().cpu().tolist())
        except Exception:
            return []
        return scores


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_v = math.exp(value)
    return exp_v / (1.0 + exp_v)
