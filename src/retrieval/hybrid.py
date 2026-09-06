"""Hybrid retrieval combining BM25 keyword search with vector similarity."""

from __future__ import annotations

import json
import logging
import math
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    class BM25Okapi:  # type: ignore
        """Pure-Python fallback implementation of BM25Okapi when rank_bm25 is not installed."""

        def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75):
            self.corpus = corpus
            self.k1 = k1
            self.b = b
            self.corpus_size = len(corpus)
            self.doc_lens = [len(doc) for doc in corpus]
            self.avgdl = sum(self.doc_lens) / self.corpus_size if self.corpus_size > 0 else 1.0

            # Document frequency
            self.doc_freqs: list[Counter] = [Counter(doc) for doc in corpus]
            self.nd: dict[str, int] = {}
            for doc in corpus:
                for word in set(doc):
                    self.nd[word] = self.nd.get(word, 0) + 1

            # Precompute IDFs
            self.idf: dict[str, float] = {}
            for word, freq in self.nd.items():
                self.idf[word] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

        def get_scores(self, query_tokens: list[str]) -> list[float]:
            scores = [0.0] * self.corpus_size
            for q in query_tokens:
                if q not in self.idf:
                    continue
                idf = self.idf[q]
                for idx, doc_freq in enumerate(self.doc_freqs):
                    freq = doc_freq.get(q, 0)
                    if freq == 0:
                        continue
                    num = freq * (self.k1 + 1)
                    denom = freq + self.k1 * (1 - self.b + self.b * (self.doc_lens[idx] / self.avgdl))
                    scores[idx] += idf * (num / denom)
            return scores

from src.retrieval.vector_store import VectorStore

logger = logging.getLogger(__name__)


class HybridRetriever:
    """Fuses BM25 (keyword) and vector (semantic) search results using RRF.

    Supports per-tenant BM25 index partitioning to guarantee tenant isolation,
    prevent cross-tenant IDF distortion, and provide rapid index rebuilding.
    """

    _MAX_INDEX_FILE_BYTES = 500 * 1024 * 1024

    def __init__(
        self,
        vector_store: VectorStore,
        alpha: float = 0.6,
        rrf_k: int = 60,
        persist_path: str | Path | None = None,
    ) -> None:
        if not 0.0 <= alpha <= 1.0:
            raise ValueError(f"alpha must be in [0, 1], got {alpha}")
        if rrf_k <= 0:
            raise ValueError(f"rrf_k must be positive, got {rrf_k}")

        self.vector_store = vector_store
        self.alpha = alpha
        self.rrf_k = rrf_k
        try:
            self.persist_dir = (
                Path(persist_path).parent
                if persist_path
                else Path(vector_store.persist_path).parent
            )
        except Exception:
            self.persist_dir = Path("./chroma_data")

        # Tenant-partitioned BM25 storage: tenant_key -> dict
        # { "bm25": BM25Okapi, "corpus_ids": [...], "corpus_texts": [...], "corpus_metadatas": [...], "stale": False }
        self._tenant_indices: dict[str, dict[str, Any]] = {}

    def _tenant_key(self, tenant_id: str | None = None) -> str:
        return str(tenant_id).strip() if tenant_id else "__default__"

    def _get_persist_path(self, tenant_id: str | None = None) -> Path:
        key = self._tenant_key(tenant_id)
        suffix = f"_{key}" if key != "__default__" else ""
        col_name = getattr(self.vector_store, "collection_name", "docs")
        return self.persist_dir / f"bm25_index_{col_name}{suffix}.json"

    # ------------------------------------------------------------------
    # Index building
    # ------------------------------------------------------------------

    def build_index(self, tenant_id: str | None = None) -> None:
        """Build the BM25 index for a specific tenant (or entire collection if None)."""
        key = self._tenant_key(tenant_id)
        where = {"tenant_id": tenant_id} if tenant_id and key != "__default__" else None

        all_chunks = self.vector_store.get_all_chunks(where=where)

        if not all_chunks:
            logger.debug("No chunks found to build BM25 index for tenant: %s", key)
            self._tenant_indices[key] = {
                "bm25": BM25Okapi(corpus=[[""]]),
                "corpus_ids": [],
                "corpus_texts": [],
                "corpus_metadatas": [],
                "stale": False,
            }
            self._save_index(tenant_id)
            return

        corpus_ids = [c["id"] for c in all_chunks]
        corpus_texts = [c["document"] for c in all_chunks]
        corpus_metadatas = [c["metadata"] for c in all_chunks]

        tokenized_corpus = [self._tokenize(doc) for doc in corpus_texts]
        bm25_obj = BM25Okapi(corpus=tokenized_corpus)

        self._tenant_indices[key] = {
            "bm25": bm25_obj,
            "corpus_ids": corpus_ids,
            "corpus_texts": corpus_texts,
            "corpus_metadatas": corpus_metadatas,
            "stale": False,
        }
        logger.info("BM25 index built for tenant '%s' with %d documents", key, len(corpus_ids))
        self._save_index(tenant_id)

    def invalidate_index(self, tenant_id: str | None = None) -> None:
        """Mark BM25 index as stale for a specific tenant or all tenants."""
        if tenant_id:
            key = self._tenant_key(tenant_id)
            if key in self._tenant_indices:
                self._tenant_indices[key]["stale"] = True
            try:
                p = self._get_persist_path(tenant_id)
                if p.exists():
                    p.unlink()
                    logger.debug("Removed stale BM25 index file: %s", p)
            except Exception:
                pass
        else:
            for key in self._tenant_indices:
                self._tenant_indices[key]["stale"] = True
            self._tenant_indices.clear()
            col_name = getattr(self.vector_store, "collection_name", "docs")
            pattern = f"bm25_index_{col_name}*.json"
            try:
                for p in self.persist_dir.glob(pattern):
                    try:
                        p.unlink()
                    except Exception:
                        pass
            except Exception:
                pass
            logger.info("Invalidated all BM25 indices")

    def _save_index(self, tenant_id: str | None = None) -> None:
        """Serialize and save the tenant's BM25 corpus to disk as JSON."""
        key = self._tenant_key(tenant_id)
        entry = self._tenant_indices.get(key)
        if not entry:
            return

        try:
            persist_path = self._get_persist_path(tenant_id)
            persist_path.parent.mkdir(parents=True, exist_ok=True)
            state = {
                "version": 2,
                "tenant_key": key,
                "corpus_ids": entry["corpus_ids"],
                "corpus_texts": entry["corpus_texts"],
                "corpus_metadatas": entry["corpus_metadatas"],
            }
            flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
            fd = os.open(persist_path, flags, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False)
            logger.debug("Saved BM25 corpus for '%s' to %s", key, persist_path)
        except Exception:
            logger.debug("Skipped saving BM25 corpus to disk (ephemeral/mock storage)")

    def _load_index(self, tenant_id: str | None = None) -> bool:
        """Load BM25 corpus for a tenant from disk and rebuild index. Returns True on success."""
        key = self._tenant_key(tenant_id)
        try:
            persist_path = self._get_persist_path(tenant_id)
            if not persist_path.exists():
                return False

            file_size = persist_path.stat().st_size
            if file_size > self._MAX_INDEX_FILE_BYTES:
                logger.warning("BM25 index file %s is too large (%d bytes)", persist_path, file_size)
                return False

            with open(persist_path, encoding="utf-8") as f:
                state = json.load(f)
            corpus_ids = state["corpus_ids"]
            corpus_texts = state["corpus_texts"]
            corpus_metadatas = state["corpus_metadatas"]

            tokenized = [self._tokenize(doc) for doc in corpus_texts]
            bm25_obj = BM25Okapi(corpus=tokenized) if tokenized else BM25Okapi(corpus=[[""]])

            self._tenant_indices[key] = {
                "bm25": bm25_obj,
                "corpus_ids": corpus_ids,
                "corpus_texts": corpus_texts,
                "corpus_metadatas": corpus_metadatas,
                "stale": False,
            }
            logger.debug("Loaded BM25 corpus from %s (%d docs)", persist_path, len(corpus_ids))
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        k: int = 10,
        where: dict[str, str | int | float] | None = None,
        user: Any = None,
    ) -> list[dict[str, Any]]:
        """Perform hybrid search: BM25 + vector, fused with RRF with access filtering.

        Args:
            query: The search query string.
            k: Number of final results.
            where: Optional metadata filter for vector search.
            user: Optional UserContext for permission-based candidate filtering.

        Returns:
            Ranked list of result dicts (id, document, metadata, score).
        """
        from src.retrieval.access_filter import build_chroma_where_clause, filter_chunks_by_access

        if user is not None and where is None:
            where = build_chroma_where_clause(user)

        tenant_id = None
        if user is not None and not getattr(user, "is_superadmin", False):
            tenant_id = getattr(user, "tenant_id", None)

        # --- BM25 scores (isolated to user's tenant) ---
        bm25_results = self._bm25_search(query, k=k, tenant_id=tenant_id)
        bm25_results = filter_chunks_by_access(bm25_results, user)
        bm25_rank = {r["id"]: i for i, r in enumerate(bm25_results)}

        # --- Vector scores ---
        vector_results = self.vector_store.similarity_search(query, k=k, where=where)
        vector_results = filter_chunks_by_access(vector_results, user)
        vector_rank = {r["id"]: i for i, r in enumerate(vector_results)}

        # --- RRF fusion ---
        all_ids = set(bm25_rank.keys()) | set(vector_rank.keys())

        rrf_scores: dict[str, float] = {}
        for doc_id in all_ids:
            bm25_r = bm25_rank.get(doc_id, k)  # default to worst rank
            vec_r = vector_rank.get(doc_id, k)
            # Weighted Reciprocal Rank Fusion
            score = self.alpha * (1.0 / (self.rrf_k + vec_r + 1)) + (1.0 - self.alpha) * (
                1.0 / (self.rrf_k + bm25_r + 1)
            )
            rrf_scores[doc_id] = score

        # --- Build result list ---
        seen_docs: dict[str, dict[str, Any]] = {}
        for r in bm25_results:
            seen_docs[r["id"]] = r
        for r in vector_results:
            if r["id"] not in seen_docs:
                seen_docs[r["id"]] = r

        sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:k]

        results = []
        for doc_id in sorted_ids:
            if doc_id in seen_docs:
                result = dict(seen_docs[doc_id])
                result["score"] = round(rrf_scores[doc_id], 4)
                results.append(result)

        return results

    def _bm25_search(self, query: str, k: int, tenant_id: str | None = None) -> list[dict[str, Any]]:
        """Run BM25 keyword search scoped to a tenant."""
        key = self._tenant_key(tenant_id)
        entry = self._tenant_indices.get(key)

        # Load from disk if cold
        if (entry is None or entry.get("bm25") is None) and (entry is None or not entry.get("stale")):
            self._load_index(tenant_id)
            entry = self._tenant_indices.get(key)

        # Build if still missing or stale
        if entry is None or entry.get("bm25") is None or entry.get("stale"):
            self.build_index(tenant_id)
            entry = self._tenant_indices.get(key)

        if entry is None or entry.get("bm25") is None:
            raise RuntimeError(f"BM25 index unavailable for tenant {key}")

        corpus_ids = entry["corpus_ids"]
        corpus_texts = entry["corpus_texts"]
        corpus_metadatas = entry["corpus_metadatas"]
        bm25_obj = entry["bm25"]

        if not corpus_ids:
            return []

        tokenized_query = self._tokenize(query)
        scores = bm25_obj.get_scores(tokenized_query)

        top_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True,
        )[:k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append(
                    {
                        "id": corpus_ids[idx],
                        "document": corpus_texts[idx],
                        "metadata": corpus_metadatas[idx],
                        "score": round(float(scores[idx]), 4),
                    }
                )
        return results

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Lowercase and split on non-alphanumeric boundaries, preserving Unicode letters."""
        return [t for t in re.split(r"[^a-zA-Z0-9À-ɏ]+", text.lower()) if t]
