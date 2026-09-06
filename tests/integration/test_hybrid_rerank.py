"""Integration tests for Phase 3: Hybrid Search (BM25 + ChromaDB + RRF) and Cross-Encoder Reranking."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token
from src.retrieval.access_filter import UserContext
from src.retrieval.hybrid import HybridRetriever
from src.retrieval.reranker import CrossEncoderReranker

TENANT_1 = str(uuid.uuid4())
TENANT_2 = str(uuid.uuid4())
USER_1 = str(uuid.uuid4())


@pytest.fixture
def tenant1_user_token() -> str:
    return create_access_token({
        "sub": USER_1,
        "email": "user@tenant1.com",
        "tenant_id": TENANT_1,
        "roles": ["viewer"],
        "is_superadmin": False,
    })


# ---------------------------------------------------------------------------
# Unit / Logic Tests: BM25 & Tenant Partitioning
# ---------------------------------------------------------------------------


def test_bm25_keyword_exact_match(tmp_path: Path) -> None:
    """BM25 successfully locates exact technical acronyms and error codes."""
    mock_vector_store = MagicMock()
    mock_vector_store.collection_name = "test_en"
    mock_vector_store.persist_path = tmp_path / "chroma"

    chunks = [
        {"id": "c1", "document": "The database reported ERR_CODE_9042_DEADLOCK during checkout.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
        {"id": "c2", "document": "Standard checkout procedure proceeds normally without errors.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
        {"id": "c3", "document": "Network timeouts are handled by retrying up to 3 times.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
    ]
    mock_vector_store.get_all_chunks.return_value = chunks

    retriever = HybridRetriever(vector_store=mock_vector_store, alpha=0.5, rrf_k=60)
    retriever.build_index(tenant_id=TENANT_1)

    results = retriever._bm25_search("ERR_CODE_9042_DEADLOCK", k=3, tenant_id=TENANT_1)
    assert len(results) >= 1
    assert results[0]["id"] == "c1"
    assert results[0]["score"] > 0


def test_bm25_tenant_partitioning_isolation(tmp_path: Path) -> None:
    """Tenant 2 cannot retrieve chunks from Tenant 1's BM25 index."""
    mock_vector_store = MagicMock()
    mock_vector_store.collection_name = "test_en"
    mock_vector_store.persist_path = tmp_path / "chroma"

    tenant1_chunks = [
        {"id": "t1_c1", "document": "CONFIDENTIAL_PROJECT_NEBULA specifications and budget.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
    ]
    tenant2_chunks = [
        {"id": "t2_c1", "document": "General public policies and HR handbook for employees.", "metadata": {"tenant_id": TENANT_2, "is_public": "true"}},
    ]

    def mock_get_all(where=None):
        if where and where.get("tenant_id") == TENANT_1:
            return tenant1_chunks
        elif where and where.get("tenant_id") == TENANT_2:
            return tenant2_chunks
        return tenant1_chunks + tenant2_chunks

    mock_vector_store.get_all_chunks.side_effect = mock_get_all

    retriever = HybridRetriever(vector_store=mock_vector_store, alpha=0.5, rrf_k=60)
    retriever.build_index(tenant_id=TENANT_1)
    retriever.build_index(tenant_id=TENANT_2)

    # Tenant 1 searches for PROJECT_NEBULA -> finds it
    t1_results = retriever._bm25_search("PROJECT_NEBULA", k=5, tenant_id=TENANT_1)
    assert len(t1_results) == 1
    assert t1_results[0]["id"] == "t1_c1"

    # Tenant 2 searches for PROJECT_NEBULA -> strictly 0 results
    t2_results = retriever._bm25_search("PROJECT_NEBULA", k=5, tenant_id=TENANT_2)
    assert len(t2_results) == 0


def test_reciprocal_rank_fusion_combined_ranking(tmp_path: Path) -> None:
    """RRF ranks higher items that appear in both BM25 and Vector search results."""
    mock_vector_store = MagicMock()
    mock_vector_store.collection_name = "test_en"
    mock_vector_store.persist_path = tmp_path / "chroma"

    chunks = [
        {"id": "c_both", "document": "Enterprise Knowledge Assistant deployment guide.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
        {"id": "c_bm25_only", "document": "Deployment command list: docker compose up.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
        {"id": "c_vec_only", "document": "Installation and launch overview for EKA.", "metadata": {"tenant_id": TENANT_1, "is_public": "true"}},
    ]
    mock_vector_store.get_all_chunks.return_value = chunks

    # Mock vector store similarity search returning c_both at rank 0, c_vec_only at rank 1
    mock_vector_store.similarity_search.return_value = [
        {"id": "c_both", "document": chunks[0]["document"], "metadata": chunks[0]["metadata"], "score": 0.95},
        {"id": "c_vec_only", "document": chunks[2]["document"], "metadata": chunks[2]["metadata"], "score": 0.85},
    ]

    retriever = HybridRetriever(vector_store=mock_vector_store, alpha=0.5, rrf_k=60)
    retriever.build_index(tenant_id=TENANT_1)

    user = UserContext(user_id=USER_1, tenant_id=TENANT_1, roles=["viewer"])
    fused_results = retriever.search("Enterprise deployment", k=3, user=user)

    assert len(fused_results) >= 2
    # c_both matches both keyword and vector, so it should rank #1
    assert fused_results[0]["id"] == "c_both"
    assert fused_results[0]["score"] > 0


# ---------------------------------------------------------------------------
# Unit / Logic Tests: Cross-Encoder Reranker
# ---------------------------------------------------------------------------


def test_reranker_fallback_mode_when_model_fails() -> None:
    """When sentence-transformers is absent, reranker falls back smoothly without crashing."""
    reranker = CrossEncoderReranker(model_name="non-existent-model")
    reranker._fallback_mode = True  # simulate fallback mode

    candidates = [
        {"id": "c1", "document": "Doc 1", "score": 0.8},
        {"id": "c2", "document": "Doc 2", "score": 0.6},
        {"id": "c3", "document": "Doc 3", "score": 0.4},
    ]

    reranked = reranker.rerank("test query", candidates, top_k=2)
    assert len(reranked) == 2
    assert reranked[0]["id"] == "c1"
    assert reranked[0]["rerank_score"] == 0.8


def test_reranker_custom_prediction_and_normalization() -> None:
    """Cross-encoder scores raw logits and normalizes them via sigmoid."""
    reranker = CrossEncoderReranker()
    mock_model = MagicMock()
    # Mock logits: Doc 2 has much higher relevance logit (+3.0) than Doc 1 (-2.0)
    mock_model.predict.return_value = [-2.0, 3.0]
    reranker._model = mock_model

    candidates = [
        {"id": "c1", "document": "Irrelevant content about apples"},
        {"id": "c2", "document": "Highly relevant answer about quantum computing"},
    ]

    reranked = reranker.rerank("quantum computing", candidates, top_k=2)
    assert len(reranked) == 2
    # c2 must be re-ordered to top
    assert reranked[0]["id"] == "c2"
    assert reranked[0]["rerank_score"] > 0.9  # sigmoid(3.0) ~ 0.95
    assert reranked[1]["id"] == "c1"
    assert reranked[1]["rerank_score"] < 0.2  # sigmoid(-2.0) ~ 0.119


def test_reranker_min_score_filtering() -> None:
    """Cross-encoder filters out documents below min_score threshold."""
    reranker = CrossEncoderReranker()
    mock_model = MagicMock()
    mock_model.predict.return_value = [-5.0, 2.5]
    reranker._model = mock_model

    candidates = [
        {"id": "c1", "document": "Completely irrelevant content"},
        {"id": "c2", "document": "Relevant information"},
    ]

    reranked = reranker.rerank("target query", candidates, top_k=5, min_score=0.5)
    assert len(reranked) == 1
    assert reranked[0]["id"] == "c2"


# ---------------------------------------------------------------------------
# API Integration Tests: /query with Hybrid & Reranker
# ---------------------------------------------------------------------------


def test_api_query_hybrid_and_reranker(client: TestClient, tenant1_user_token: str) -> None:
    """POST /query with use_hybrid=True and use_reranker=True returns reranked citations and header."""
    with patch("src.api.app.get_pipeline") as mock_get_pipe:
        mock_pipeline = MagicMock()
        mock_citations = [
            MagicMock(
                chunk_id="chunk-42",
                source="handbook.pdf",
                filename="handbook.pdf",
                text_snippet="Employee benefits handbook",
                score=0.92,
                rerank_score=0.96,
            )
        ]
        # mock CitationFormatter.to_dict
        mock_pipeline.query_async = AsyncMock(
            return_value=(
                "According to the handbook, benefits include health insurance.",
                mock_citations,
                False,
                0.96
            )
        )
        mock_get_pipe.return_value = mock_pipeline

        with patch("src.generation.citations.CitationFormatter.to_dict") as mock_to_dict:
            mock_to_dict.return_value = [
                {
                    "chunk_id": "chunk-42",
                    "source": "handbook.pdf",
                    "filename": "handbook.pdf",
                    "text_snippet": "Employee benefits handbook",
                    "score": 0.92,
                    "rerank_score": 0.96,
                }
            ]

            response = client.post(
                "/query",
                json={
                    "question": "What benefits do employees get?",
                    "use_hybrid": True,
                    "use_reranker": True,
                },
                headers={"Authorization": f"Bearer {tenant1_user_token}"},
            )
            assert response.status_code == 200
            assert response.headers.get("X-RAG-Retrieval-Mode") == "hybrid+reranker"

            data = response.json()
            assert "benefits include health insurance" in data["answer"]
            assert len(data["citations"]) == 1
            assert data["citations"][0]["rerank_score"] == 0.96
