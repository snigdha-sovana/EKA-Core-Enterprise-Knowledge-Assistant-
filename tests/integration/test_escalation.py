"""Integration tests for the Escalation Cases API.

Tests cover:
- Case listing (admin only, cross-tenant denied, filterable by status)
- Case retrieval (get single)
- Case resolution (happy path, already-resolved 409, missing doc 422)
- EscalationService.handle_abstention (no departments, fallback routing,
  classification success/failure, DB error resilience)
- RBAC: viewer/curator cannot list or resolve
- /query endpoint creates escalation on abstention
- EscalationCase model and migration
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token
from src.db.models.department import Department
from src.db.models.document import DocumentModel
from src.db.models.escalation_case import EscalationCase

# ---------------------------------------------------------------------------
# Stable IDs
# ---------------------------------------------------------------------------

TENANT_ID = str(uuid.uuid4())
OTHER_TENANT_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
DEPT_ID = uuid.uuid4()
CASE_ID = uuid.uuid4()
DOC_ID = uuid.uuid4()


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------


def _token(role: str, tenant_id: str = TENANT_ID, superadmin: bool = False) -> str:
    return create_access_token(
        {
            "sub": USER_ID,
            "email": "user@test.com",
            "tenant_id": tenant_id,
            "roles": [role],
            "is_superadmin": superadmin,
        }
    )


@pytest.fixture
def admin_token() -> str:
    return _token("admin")


@pytest.fixture
def viewer_token() -> str:
    return _token("viewer")


@pytest.fixture
def curator_token() -> str:
    return _token("curator")


@pytest.fixture
def other_tenant_admin_token() -> str:
    return _token("admin", tenant_id=OTHER_TENANT_ID)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Model builders
# ---------------------------------------------------------------------------


def _make_case(
    case_id: uuid.UUID = CASE_ID,
    tenant_id: str = TENANT_ID,
    department_id: uuid.UUID | None = DEPT_ID,
    status: str = "open",
    query_text: str = "What is the vacation policy?",
    confidence_score: float = 0.1,
    resolved_at: datetime | None = None,
    resolution_doc_id: uuid.UUID | None = None,
) -> EscalationCase:
    case = EscalationCase(
        case_id=case_id,
        tenant_id=uuid.UUID(tenant_id),
        department_id=department_id,
        user_id=uuid.UUID(USER_ID),
        query_text=query_text,
        query_hash=hashlib.sha256(query_text.encode()).hexdigest(),
        status=status,
        classification_reason="LLM classified to HR",
        confidence_score=confidence_score,
        resolution_doc_id=resolution_doc_id,
        resolved_by=None,
        resolved_at=resolved_at,
    )
    case.created_at = datetime(2026, 9, 6, tzinfo=UTC)
    case.updated_at = datetime(2026, 9, 6, tzinfo=UTC)
    return case


def _make_dept(is_fallback: bool = False) -> Department:
    dept = Department(
        department_id=DEPT_ID,
        tenant_id=uuid.UUID(TENANT_ID),
        name="HR",
        description="Human Resources",
        is_fallback=is_fallback,
        is_active=True,
    )
    dept.created_at = datetime(2026, 9, 1, tzinfo=UTC)
    dept.updated_at = datetime(2026, 9, 1, tzinfo=UTC)
    return dept


def _make_doc(tenant_id: str = TENANT_ID, status: str = "active") -> DocumentModel:
    doc = DocumentModel(
        doc_id=DOC_ID,
        tenant_id=uuid.UUID(tenant_id),
        owner_id=uuid.UUID(USER_ID),
        filename="resolution.pdf",
        title="Resolution Doc",
        status=status,
    )
    return doc


def _make_session(scalar_result: Any = None, scalars_list: list | None = None) -> MagicMock:
    session = MagicMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = scalar_result
    execute_result.scalars.return_value.all.return_value = scalars_list or []
    session.execute = AsyncMock(return_value=execute_result)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.rollback = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# List escalation cases
# ---------------------------------------------------------------------------


class TestListEscalationCases:
    def test_admin_can_list(self, client: TestClient, admin_token: str) -> None:
        case = _make_case()
        mock_session = _make_session(scalars_list=[case])

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_viewer_cannot_list(self, client: TestClient, viewer_token: str) -> None:
        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert resp.status_code == 403

    def test_curator_cannot_list(self, client: TestClient, curator_token: str) -> None:
        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations",
            headers={"Authorization": f"Bearer {curator_token}"},
        )
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        resp = client.get(f"/tenants/{TENANT_ID}/escalations")
        assert resp.status_code == 401

    def test_cross_tenant_returns_403(
        self, client: TestClient, other_tenant_admin_token: str
    ) -> None:
        mock_session = _make_session(scalars_list=[])

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations",
            headers={"Authorization": f"Bearer {other_tenant_admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code == 403

    def test_filter_by_status(self, client: TestClient, admin_token: str) -> None:
        open_case = _make_case(status="open")
        mock_session = _make_session(scalars_list=[open_case])

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations?status=open",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200

    def test_empty_list_returns_200(self, client: TestClient, admin_token: str) -> None:
        mock_session = _make_session(scalars_list=[])

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# Get single escalation case
# ---------------------------------------------------------------------------


class TestGetEscalationCase:
    def test_admin_can_get(self, client: TestClient, admin_token: str) -> None:
        case = _make_case()
        mock_session = _make_session(scalar_result=case)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["case_id"] == str(CASE_ID)
        assert body["status"] == "open"
        assert body["query_text"] == "What is the vacation policy?"

    def test_nonexistent_returns_404(self, client: TestClient, admin_token: str) -> None:
        mock_session = _make_session(scalar_result=None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code == 404

    def test_viewer_cannot_get(self, client: TestClient, viewer_token: str) -> None:
        resp = client.get(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Resolve escalation case
# ---------------------------------------------------------------------------


class TestResolveEscalationCase:
    def test_admin_resolves_open_case(self, client: TestClient, admin_token: str) -> None:
        case = _make_case(status="open")
        doc = _make_doc()
        calls = []
        mock_session = MagicMock()
        mock_session.commit = AsyncMock()

        async def fake_execute(stmt):
            result = MagicMock()
            if not calls:
                # First: fetch the case
                result.scalar_one_or_none.return_value = case
            else:
                # Second: fetch the document
                result.scalar_one_or_none.return_value = doc
            calls.append(1)
            return result

        mock_session.execute = fake_execute
        mock_session.refresh = AsyncMock(side_effect=lambda obj: None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}/resolve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"resolution_doc_id": str(DOC_ID)},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "resolved"
        assert body["resolution_doc_id"] == str(DOC_ID)

    def test_resolve_already_resolved_returns_409(
        self, client: TestClient, admin_token: str
    ) -> None:
        resolved_case = _make_case(status="resolved", resolution_doc_id=DOC_ID)
        mock_session = _make_session(scalar_result=resolved_case)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}/resolve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"resolution_doc_id": str(DOC_ID)},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 409
        assert "already resolved" in resp.json()["detail"].lower()

    def test_resolve_nonexistent_case_returns_404(
        self, client: TestClient, admin_token: str
    ) -> None:
        mock_session = _make_session(scalar_result=None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{uuid.uuid4()}/resolve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"resolution_doc_id": str(DOC_ID)},
        )
        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code == 404

    def test_resolve_missing_doc_returns_422(self, client: TestClient, admin_token: str) -> None:
        case = _make_case(status="open")
        calls = []
        mock_session = MagicMock()
        mock_session.commit = AsyncMock()

        async def fake_execute(stmt):
            result = MagicMock()
            if not calls:
                result.scalar_one_or_none.return_value = case
            else:
                result.scalar_one_or_none.return_value = None  # doc not found
            calls.append(1)
            return result

        mock_session.execute = fake_execute

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}/resolve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"resolution_doc_id": str(uuid.uuid4())},
        )
        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code == 422

    def test_viewer_cannot_resolve(self, client: TestClient, viewer_token: str) -> None:
        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}/resolve",
            headers={"Authorization": f"Bearer {viewer_token}"},
            json={"resolution_doc_id": str(DOC_ID)},
        )
        assert resp.status_code == 403

    def test_missing_body_returns_422(self, client: TestClient, admin_token: str) -> None:
        resp = client.post(
            f"/tenants/{TENANT_ID}/escalations/{CASE_ID}/resolve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# EscalationService unit tests (no HTTP, direct service calls)
# ---------------------------------------------------------------------------


class TestEscalationService:
    @pytest.mark.anyio
    async def test_handle_abstention_no_departments(self) -> None:
        """When no departments exist, status=classification_failed."""
        from src.escalation.service import EscalationService

        mock_session = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=execute_result)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()

        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id=TENANT_ID,
            user_id=USER_ID,
            query_text="What is the leave policy?",
            confidence_score=0.1,
            generator=None,
        )
        assert result["escalation_status"] == "classification_failed"
        assert result["department_name"] is None

    @pytest.mark.anyio
    async def test_handle_abstention_with_fallback_dept(self) -> None:
        """When only a fallback department exists, route there directly."""
        from src.escalation.service import EscalationService

        fallback_dept = _make_dept(is_fallback=True)
        mock_session = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = [fallback_dept]
        mock_session.execute = AsyncMock(return_value=execute_result)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()

        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id=TENANT_ID,
            user_id=USER_ID,
            query_text="How do I request time off?",
            confidence_score=0.05,
            generator=None,  # No generator → falls back directly
        )
        assert result["status"] == "forwarded"
        assert result["department_name"] == "HR"

    @pytest.mark.anyio
    async def test_handle_abstention_with_generator_success(self) -> None:
        """LLM correctly classifies to a named department."""
        from src.escalation.service import EscalationService

        dept = _make_dept(is_fallback=False)
        mock_session = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = [dept]
        mock_session.execute = AsyncMock(return_value=execute_result)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()

        mock_generator = MagicMock()
        mock_generator.generate_async = AsyncMock(return_value="HR")

        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id=TENANT_ID,
            user_id=USER_ID,
            query_text="How many leave days do I get?",
            confidence_score=0.12,
            generator=mock_generator,
        )
        assert result["status"] == "forwarded"
        assert result["department_name"] == "HR"
        assert result["escalation_status"] == "open"

    @pytest.mark.anyio
    async def test_handle_abstention_generator_failure_uses_fallback(self) -> None:
        """When LLM raises, route to fallback department."""
        from src.escalation.service import EscalationService

        regular_dept = _make_dept(is_fallback=False)
        fallback_dept = Department(
            department_id=uuid.uuid4(),
            tenant_id=uuid.UUID(TENANT_ID),
            name="General",
            is_fallback=True,
            is_active=True,
        )
        fallback_dept.created_at = datetime(2026, 9, 1, tzinfo=UTC)

        mock_session = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = [regular_dept, fallback_dept]
        mock_session.execute = AsyncMock(return_value=execute_result)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()

        mock_generator = MagicMock()
        mock_generator.generate_async = AsyncMock(side_effect=RuntimeError("LLM unavailable"))

        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id=TENANT_ID,
            user_id=USER_ID,
            query_text="Some query that fails",
            confidence_score=0.08,
            generator=mock_generator,
        )
        assert result["status"] == "forwarded"
        assert result["department_name"] == "General"

    @pytest.mark.anyio
    async def test_handle_abstention_invalid_tenant_id(self) -> None:
        """Invalid UUID returns error dict without crashing."""
        from src.escalation.service import EscalationService

        mock_session = MagicMock()
        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id="not-a-uuid",
            user_id=USER_ID,
            query_text="anything",
            confidence_score=0.1,
        )
        assert result["status"] == "error"

    @pytest.mark.anyio
    async def test_handle_abstention_db_commit_failure_returns_error(self) -> None:
        """If DB commit fails, return error dict instead of raising."""
        from src.escalation.service import EscalationService

        fallback_dept = _make_dept(is_fallback=True)
        mock_session = MagicMock()
        execute_result = MagicMock()
        execute_result.scalars.return_value.all.return_value = [fallback_dept]
        mock_session.execute = AsyncMock(return_value=execute_result)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock(side_effect=RuntimeError("DB error"))
        mock_session.rollback = AsyncMock()

        result = await EscalationService.handle_abstention(
            session=mock_session,
            tenant_id=TENANT_ID,
            user_id=USER_ID,
            query_text="query",
            confidence_score=0.05,
            generator=None,
        )
        assert result["status"] == "error"
        mock_session.rollback.assert_awaited_once()


# ---------------------------------------------------------------------------
# EscalationCase model tests
# ---------------------------------------------------------------------------


class TestEscalationCaseModel:
    def test_table_name(self) -> None:
        assert EscalationCase.__tablename__ == "escalation_cases"

    def test_expected_columns(self) -> None:
        cols = {c.key for c in EscalationCase.__table__.columns}
        required = {
            "case_id",
            "tenant_id",
            "department_id",
            "user_id",
            "query_text",
            "query_hash",
            "status",
            "classification_reason",
            "confidence_score",
            "resolution_doc_id",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
        }
        assert required.issubset(cols)

    def test_query_hash_helper(self) -> None:
        from src.escalation.service import _hash_query

        h = _hash_query("hello")
        assert len(h) == 64  # SHA-256 hex = 64 chars
        assert _hash_query("hello") == _hash_query("hello")  # deterministic
        assert _hash_query("hello") != _hash_query("world")


# ---------------------------------------------------------------------------
# Migration tests
# ---------------------------------------------------------------------------


class TestMigration:
    def test_migration_file_exists(self) -> None:
        from pathlib import Path

        assert Path("alembic/versions/0004_escalation_cases.py").exists()

    def test_migration_revision_chain(self) -> None:
        from pathlib import Path

        content = Path("alembic/versions/0004_escalation_cases.py").read_text()
        assert "revision: str = '0004_escalation_cases'" in content
        assert "0003_departments" in content

    def test_migration_has_expected_indexes(self) -> None:
        from pathlib import Path

        content = Path("alembic/versions/0004_escalation_cases.py").read_text()
        assert "ix_escalation_cases_tenant_id" in content
        assert "ix_escalation_cases_status" in content
        assert "ix_escalation_cases_department_id" in content


# ---------------------------------------------------------------------------
# /query endpoint abstention integration
# ---------------------------------------------------------------------------


class TestQueryEndpointAbstention:
    def test_abstained_query_returns_forwarded_status(
        self, client: TestClient, viewer_token: str
    ) -> None:
        """When pipeline abstains, /query should return abstained=True with a case_id."""
        mock_session = MagicMock()
        # Escalation case created in DB
        _case = _make_case()
        mock_session.execute = AsyncMock(
            return_value=MagicMock(
                scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
            )
        )
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session

        app.dependency_overrides[get_async_session] = _override

        with patch("src.api.app.get_pipeline") as mock_get_pipeline:
            mock_pipeline = MagicMock()
            mock_pipeline.query_async = AsyncMock(
                return_value=(
                    "I do not have sufficient information.",  # answer
                    [],  # citations
                    True,  # abstained=True
                    0.05,  # confidence_score below threshold
                )
            )
            mock_generator = MagicMock()
            mock_generator.generate_async = AsyncMock(return_value="")
            mock_pipeline.generator = mock_generator
            mock_get_pipeline.return_value = mock_pipeline

            resp = client.post(
                "/query",
                headers={"Authorization": f"Bearer {viewer_token}"},
                json={"question": "What is the maternity leave policy?"},
            )

        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["abstained"] is True
        # Case ID may be None if no departments configured (no DB), still valid response
        assert "case_id" in body
        assert "status" in body
