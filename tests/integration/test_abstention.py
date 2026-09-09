"""Integration tests for Phase 4: Citations, Confidence Scoring & Abstention Logic."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token

TENANT_1 = str(uuid.uuid4())
USER_1 = str(uuid.uuid4())


@pytest.fixture
def tenant1_user_token() -> str:
    return create_access_token(
        {
            "sub": USER_1,
            "email": "user@tenant1.com",
            "tenant_id": TENANT_1,
            "roles": ["viewer"],
            "is_superadmin": False,
        }
    )


def test_abstention_on_low_confidence(tenant1_user_token: str) -> None:
    """Low-confidence query triggers escalation case creation and returns forwarding payload."""
    from src.db.engine import get_async_session

    # Mock DB session for EscalationService (no live DB needed)
    mock_session = MagicMock()
    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = []  # no departments
    mock_session.execute = AsyncMock(return_value=execute_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.rollback = AsyncMock()

    async def _override_session():
        yield mock_session

    with TestClient(app) as client:
        with patch("src.api.app.get_pipeline") as mock_get_pipeline:
            mock_pipeline = MagicMock()
            mock_pipeline.query_async = AsyncMock(
                return_value=(
                    "I do not have sufficient authoritative information.",
                    [],
                    True,  # abstained
                    0.15,  # confidence below threshold
                )
            )
            mock_generator = MagicMock()
            mock_generator.generate_async = AsyncMock(return_value="")
            mock_pipeline.generator = mock_generator
            mock_get_pipeline.return_value = mock_pipeline

            app.dependency_overrides[get_async_session] = _override_session
            try:
                response = client.post(
                    "/query",
                    json={
                        "question": "What is the recipe for a chocolate cake?",
                        "use_hybrid": True,
                        "use_reranker": True,
                    },
                    headers={"Authorization": f"Bearer {tenant1_user_token}"},
                )
            finally:
                app.dependency_overrides.pop(get_async_session, None)

            assert response.status_code == 200
            data = response.json()
            assert data["abstained"] is True
            assert data["confidence_score"] == 0.15
            assert len(data["citations"]) == 0
            # Phase 6: response includes escalation fields
            assert "case_id" in data
            assert "status" in data
            # Answer is the forwarding message
            assert "forwarded" in data["answer"].lower() or "case" in data["answer"].lower()


def test_high_confidence_returns_citations(tenant1_user_token: str) -> None:
    """Test that a query with high confidence correctly formats citations and does not abstain."""
    with TestClient(app) as client:
        # Mock pipeline to return high relevance chunks
        with patch("src.api.app.get_pipeline") as mock_get_pipeline:
            mock_pipeline = MagicMock()

            # The async query returns (answer, citations, abstained, confidence)
            from src.generation.citations import Citation

            mock_pipeline.query_async = AsyncMock(
                return_value=(
                    "The server uses Nginx for load balancing [1].",
                    [
                        Citation(
                            chunk_id="c1",
                            source="arch.md",
                            filename="arch.md",
                            text_snippet="Nginx is used...",
                            score=0.9,
                            rerank_score=0.85,
                        )
                    ],
                    False,
                    0.85,
                )
            )
            mock_get_pipeline.return_value = mock_pipeline

            response = client.post(
                "/query",
                json={
                    "question": "What is used for load balancing?",
                    "use_hybrid": True,
                    "use_reranker": True,
                },
                headers={"Authorization": f"Bearer {tenant1_user_token}"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["abstained"] is False
            assert data["confidence_score"] == 0.85
            assert "[1]" in data["answer"]
            assert len(data["citations"]) == 1
            assert data["citations"][0]["filename"] == "arch.md"


def test_streaming_abstention_on_low_confidence(tenant1_user_token: str) -> None:
    """Streaming: low-confidence query creates escalation case and streams forwarding payload."""
    from src.db.engine import get_async_session

    mock_session = MagicMock()
    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = []  # no departments
    mock_session.execute = AsyncMock(return_value=execute_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.rollback = AsyncMock()

    async def _override_session():
        yield mock_session

    with TestClient(app) as client:
        with patch("src.api.app.get_pipeline") as mock_get_pipeline:
            mock_pipeline = MagicMock()
            mock_pipeline._retrieve = MagicMock(
                return_value=[{"id": "c1", "document": "xyz", "score": 0.2, "rerank_score": 0.1}]
            )
            mock_pipeline._apply_reranker = MagicMock(
                return_value=[{"id": "c1", "document": "xyz", "score": 0.2, "rerank_score": 0.1}]
            )
            mock_generator = MagicMock()
            mock_generator.generate_async = AsyncMock(return_value="")
            mock_pipeline.generator = mock_generator
            mock_get_pipeline.return_value = mock_pipeline

            app.dependency_overrides[get_async_session] = _override_session
            try:
                response = client.post(
                    "/query/stream",
                    json={
                        "question": "What is the capital of Mars?",
                        "use_hybrid": True,
                        "use_reranker": True,
                    },
                    headers={"Authorization": f"Bearer {tenant1_user_token}"},
                )
            finally:
                app.dependency_overrides.pop(get_async_session, None)

            assert response.status_code == 200
            content = response.text
            # Phase 6: stream now emits the forwarding message
            assert "forwarded" in content.lower() or "case" in content.lower()
            assert '"abstained": true' in content
            assert '"confidence_score": 0.1' in content
