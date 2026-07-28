"""Embedding providers for episode summary vectors."""

from __future__ import annotations

import hashlib
import math
import os
import re
from typing import Protocol

from db.models import EMBEDDING_DIM


class Embedder(Protocol):
    dim: int

    def embed(self, text: str) -> list[float]: ...


def _l2_normalize(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [v / norm for v in values]


class StubEmbedder:
    """Deterministic bag-of-tokens embedder for tests/CI (no API key)."""

    def __init__(self, dim: int = EMBEDDING_DIM):
        self.dim = dim

    def embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
        if not tokens:
            tokens = ["empty"]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "big") % self.dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            weight = 1.0 + (digest[5] / 255.0)
            vec[idx] += sign * weight
            # Secondary bucket improves near-duplicate discrimination a bit.
            idx2 = int.from_bytes(digest[6:10], "big") % self.dim
            vec[idx2] += 0.35 * sign
        return _l2_normalize(vec)


class GeminiEmbedder:
    """Gemini / Google Generative AI text embeddings (768-d by default)."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        dim: int = EMBEDDING_DIM,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
        self.dim = dim
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set")

    def embed(self, text: str) -> list[float]:
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise ValueError("google-generativeai package is required for Gemini embeddings") from exc

        genai.configure(api_key=self.api_key)
        kwargs: dict = {"model": self.model, "content": text or " "}
        # Newer models accept output_dimensionality; older ones ignore/reject it.
        try:
            result = genai.embed_content(**kwargs, output_dimensionality=self.dim)
        except TypeError:
            result = genai.embed_content(**kwargs)
        values = list(result["embedding"])
        if len(values) != self.dim:
            # Pad/truncate if provider returns a different width.
            if len(values) < self.dim:
                values = values + [0.0] * (self.dim - len(values))
            else:
                values = values[: self.dim]
            values = _l2_normalize(values)
        return values


def get_embedder(provider: str | None = None) -> Embedder:
    name = (provider or os.getenv("EMBEDDING_PROVIDER", "gemini")).strip().lower()
    if name in {"stub", "hash", "test", "fake"}:
        return StubEmbedder()
    if name in {"gemini", "google"}:
        return GeminiEmbedder()
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {name}")
