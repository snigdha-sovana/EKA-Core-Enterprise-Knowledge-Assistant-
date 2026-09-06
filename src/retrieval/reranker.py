"""Cross-encoder re-ranker for improving retrieval precision with graceful fallback."""

from __future__ import annotations

import logging
import math
import threading
from typing import Any

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    """Re-ranks retrieval results using a cross-encoder model.

    Cross-encoders jointly encode query + document for more accurate relevance
    scoring than bi-encoder (vector similarity) approaches.
    Includes thread-safe lazy loading and graceful fallback for resource-constrained environments.
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        min_score: float | None = None,
    ) -> None:
        self.model_name = model_name
        self.min_score = min_score
        self._model = None
        self._lock = threading.Lock()
        self._fallback_mode = False

    def _lazy_load(self) -> None:
        """Load the cross-encoder model on first use with thread safety and graceful fallback."""
        if self._model is not None or self._fallback_mode:
            return

        with self._lock:
            if self._model is not None or self._fallback_mode:
                return

            try:
                import torch

                torch.set_num_threads(1)
                logger.debug("Constraining PyTorch to 1 CPU thread.")
            except ImportError:
                pass

            try:
                from sentence_transformers import CrossEncoder

                logger.info("Loading cross-encoder model: %s", self.model_name)
                self._model = CrossEncoder(self.model_name)
                logger.info("Cross-encoder model '%s' loaded successfully.", self.model_name)
            except Exception as exc:
                logger.warning(
                    "Could not load cross-encoder model '%s' (%s). "
                    "Operating in fallback mode (preserving hybrid rank scores).",
                    self.model_name,
                    exc,
                )
                self._fallback_mode = True

    def rerank(
        self,
        query: str,
        results: list[dict[str, Any]],
        top_k: int = 5,
        min_score: float | None = None,
    ) -> list[dict[str, Any]]:
        """Re-rank retrieved results by cross-encoder relevance scoring.

        Args:
            query: The original search query.
            results: List of result dicts (must contain "document" key).
            top_k: Number of top results to return after re-ranking.
            min_score: Optional minimum score threshold to exclude poor matches.

        Returns:
            Results sorted by cross-encoder relevance score (descending).
        """
        if not results:
            return []

        self._lazy_load()

        # Fallback path if model could not be loaded
        if self._fallback_mode or self._model is None:
            logger.debug("Reranking in fallback mode for %d items", len(results))
            for r in results:
                if "rerank_score" not in r:
                    r["rerank_score"] = r.get("score", 0.5)
            return results[:top_k]

        # Prepare query-document pairs
        pairs = [(query, r.get("document", "")) for r in results]

        try:
            scores = self._model.predict(pairs)
            if hasattr(scores, "tolist"):
                scores = scores.tolist()
        except Exception as exc:
            logger.warning("Cross-encoder prediction failed: %s. Using fallback ranks.", exc)
            for r in results:
                if "rerank_score" not in r:
                    r["rerank_score"] = r.get("score", 0.5)
            return results[:top_k]

        # Augment results with cross-encoder scores (calibrated via sigmoid into [0, 1])
        cutoff = min_score if min_score is not None else self.min_score
        scored_results: list[dict[str, Any]] = []

        for i, raw_score in enumerate(scores):
            # Sigmoid normalization for raw logits
            raw_float = float(raw_score)
            try:
                norm_score = 1.0 / (1.0 + math.exp(-raw_float))
            except OverflowError:
                norm_score = 1.0 if raw_float > 0 else 0.0

            final_score = round(norm_score, 4)

            if cutoff is not None and final_score < cutoff:
                continue

            item = dict(results[i])
            item["rerank_score"] = final_score
            item["raw_rerank_score"] = round(raw_float, 4)
            scored_results.append(item)

        # Sort by cross-encoder score descending
        reranked = sorted(scored_results, key=lambda r: r.get("rerank_score", 0.0), reverse=True)

        logger.debug(
            "Re-ranked %d results to %d results. Top score: %.4f",
            len(results),
            min(len(reranked), top_k),
            reranked[0]["rerank_score"] if reranked else 0.0,
        )

        return reranked[:top_k]
