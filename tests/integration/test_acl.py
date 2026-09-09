"""Integration tests for Document-Level Access Control (ACL), Tenant Isolation, and Audit Logs."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.audit.service import hash_query_text
from src.auth.security import create_access_token
from src.db.engine import get_async_session
from src.db.models.audit_log import AuditLog
from src.db.models.document import DocumentModel
from src.ingestion.access_control import AccessPolicy, build_chunk_acl_metadata
from src.retrieval.access_filter import UserContext, can_user_access_chunk, filter_chunks_by_access

# IDs for testing
TENANT_A = str(uuid.uuid4())
TENANT_B = str(uuid.uuid4())
USER_FINANCE_ID = str(uuid.uuid4())
USER_ENG_ID = str(uuid.uuid4())
USER_TENANT_B_ID = str(uuid.uuid4())


@pytest.fixture
def finance_user_token() -> str:
    return create_access_token(
        {
            "sub": USER_FINANCE_ID,
            "email": "finance@tenant-a.com",
            "tenant_id": TENANT_A,
            "roles": ["viewer", "finance"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def eng_user_token() -> str:
    return create_access_token(
        {
            "sub": USER_ENG_ID,
            "email": "eng@tenant-a.com",
            "tenant_id": TENANT_A,
            "roles": ["viewer", "engineering"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def tenant_b_finance_token() -> str:
    return create_access_token(
        {
            "sub": USER_TENANT_B_ID,
            "email": "finance@tenant-b.com",
            "tenant_id": TENANT_B,
            "roles": ["viewer", "finance"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def tenant_a_admin_token() -> str:
    return create_access_token(
        {
            "sub": str(uuid.uuid4()),
            "email": "admin@tenant-a.com",
            "tenant_id": TENANT_A,
            "roles": ["admin"],
            "is_superadmin": False,
        }
    )


# ---------------------------------------------------------------------------
# Unit / Logic Tests: ACL Filtering & Metadata
# ---------------------------------------------------------------------------


def test_build_chunk_acl_metadata() -> None:
    """Verify metadata construction for restricted policies."""
    policy = AccessPolicy(
        is_public=False,
        roles=["finance", "executive"],
        user_ids=["user-123"],
    )
    meta = build_chunk_acl_metadata(
        tenant_id="tenant-x",
        doc_id="doc-abc",
        policy=policy,
    )
    assert meta["tenant_id"] == "tenant-x"
    assert meta["doc_id"] == "doc-abc"
    assert meta["is_public"] == "false"
    assert meta["allowed_roles"] == ",finance,executive,"
    assert meta["allowed_users"] == ",user-123,"


def test_can_user_access_chunk_public() -> None:
    """Public chunk in same tenant is accessible to any user."""
    user = UserContext(
        user_id=USER_ENG_ID,
        tenant_id=TENANT_A,
        roles=["engineering"],
    )
    chunk_meta = {
        "tenant_id": TENANT_A,
        "is_public": "true",
        "allowed_roles": "",
        "allowed_users": "",
    }
    assert can_user_access_chunk(chunk_meta, user) is True


def test_can_user_access_chunk_restricted_role() -> None:
    """Role-restricted chunk is only accessible to matching role."""
    finance_chunk_meta = {
        "tenant_id": TENANT_A,
        "is_public": "false",
        "allowed_roles": ",finance,executive,",
        "allowed_users": "",
    }
    user_finance = UserContext(user_id=USER_FINANCE_ID, tenant_id=TENANT_A, roles=["finance"])
    user_eng = UserContext(user_id=USER_ENG_ID, tenant_id=TENANT_A, roles=["engineering"])

    assert can_user_access_chunk(finance_chunk_meta, user_finance) is True
    assert can_user_access_chunk(finance_chunk_meta, user_eng) is False


def test_can_user_access_chunk_cross_tenant_rejected() -> None:
    """Chunks from Tenant A are never accessible to users from Tenant B."""
    tenant_a_chunk_meta = {
        "tenant_id": TENANT_A,
        "is_public": "true",
        "allowed_roles": ",finance,",
        "allowed_users": "",
    }
    user_tenant_b = UserContext(user_id=USER_TENANT_B_ID, tenant_id=TENANT_B, roles=["finance"])
    assert can_user_access_chunk(tenant_a_chunk_meta, user_tenant_b) is False


def test_superadmin_bypasses_acls() -> None:
    """Superadmins have access across tenants and restricted roles."""
    superadmin = UserContext(
        user_id="super-1",
        tenant_id="any-tenant",
        roles=["admin"],
        is_superadmin=True,
    )
    secret_chunk_meta = {
        "tenant_id": TENANT_A,
        "is_public": "false",
        "allowed_roles": ",strictly_classified,",
        "allowed_users": ",someone_else,",
    }
    assert can_user_access_chunk(secret_chunk_meta, superadmin) is True


def test_filter_chunks_by_access() -> None:
    """Filter list of chunks preserving only authorized items."""
    user = UserContext(user_id=USER_FINANCE_ID, tenant_id=TENANT_A, roles=["finance"])
    chunks = [
        {"id": "1", "metadata": {"tenant_id": TENANT_A, "is_public": "true"}},
        {
            "id": "2",
            "metadata": {"tenant_id": TENANT_A, "is_public": "false", "allowed_roles": ",finance,"},
        },
        {
            "id": "3",
            "metadata": {"tenant_id": TENANT_A, "is_public": "false", "allowed_roles": ",legal,"},
        },
        {"id": "4", "metadata": {"tenant_id": TENANT_B, "is_public": "true"}},
    ]
    allowed = filter_chunks_by_access(chunks, user)
    assert [c["id"] for c in allowed] == ["1", "2"]


# ---------------------------------------------------------------------------
# API Integration Tests: Retrieval with ACL & Silent Non-Leakage
# ---------------------------------------------------------------------------


def test_query_silent_non_leakage(client: TestClient, eng_user_token: str) -> None:
    """When a user retrieves only unauthorized chunks, empty context is silently forwarded.

    Phase 6: abstained queries now create an escalation case and return a forwarding
    message. The core contract (no citations, abstained=True, no 403) still holds.
    """
    from src.db.engine import get_async_session

    mock_session = MagicMock()
    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(return_value=execute_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.rollback = AsyncMock()

    async def _override_session():
        yield mock_session

    with patch("src.api.app.get_pipeline") as mock_get_pipe:
        mock_pipeline = MagicMock()
        mock_pipeline.query_async = AsyncMock(
            return_value=(
                "I could not find any relevant information.",
                [],
                True,
                0.0,
            )
        )
        mock_generator = MagicMock()
        mock_generator.generate_async = AsyncMock(return_value="")
        mock_pipeline.generator = mock_generator
        mock_get_pipe.return_value = mock_pipeline

        client.app.dependency_overrides[get_async_session] = _override_session
        try:
            response = client.post(
                "/query",
                json={"question": "What is Q3 secret budget?"},
                headers={"Authorization": f"Bearer {eng_user_token}"},
            )
        finally:
            client.app.dependency_overrides.pop(get_async_session, None)

        assert response.status_code == 200
        data = response.json()
        # Core silent non-leakage: no citations, no 403, abstained
        assert data["abstained"] is True
        assert len(data["citations"]) == 0
        assert "case_id" in data  # Phase 6 escalation field present


def test_tenant_isolation_in_query(client: TestClient, tenant_b_finance_token: str) -> None:
    """Tenant B user querying passes Tenant B UserContext to pipeline."""
    with patch("src.api.app.get_pipeline") as mock_get_pipe:
        mock_pipeline = MagicMock()
        mock_pipeline.query_async = AsyncMock(return_value=("Answer for Tenant B", [], False, 0.95))
        mock_get_pipe.return_value = mock_pipeline

        response = client.post(
            "/query",
            json={"question": "Revenue targets?"},
            headers={"Authorization": f"Bearer {tenant_b_finance_token}"},
        )
        assert response.status_code == 200

        # Verify UserContext passed to pipeline
        call_args = mock_pipeline.query_async.call_args
        assert call_args is not None
        user_arg = call_args.kwargs.get("user")
        assert user_arg is not None
        assert user_arg.tenant_id == TENANT_B
        assert "finance" in user_arg.roles


# ---------------------------------------------------------------------------
# API Integration Tests: 100-Document Quota
# ---------------------------------------------------------------------------


def test_ingest_quota_limit_enforced(client: TestClient, tenant_a_admin_token: str) -> None:
    """Attempting to ingest when tenant has >= 100 active documents returns HTTP 400."""
    mock_session = AsyncMock()
    mock_scalar = MagicMock()
    mock_scalar.scalar.return_value = 100  # Cap reached
    mock_session.execute.return_value = mock_scalar

    app.dependency_overrides[get_async_session] = lambda: mock_session
    try:
        with patch("src.api.app._resolve_ingest_source") as mock_resolve:
            mock_resolve.return_value = MagicMock()
            response = client.post(
                "/ingest",
                json={
                    "source": "data/doc101.txt",
                    "title": "Overflow Document",
                },
                headers={"Authorization": f"Bearer {tenant_a_admin_token}"},
            )
            assert response.status_code == 400
            assert (
                "Tenant document limit reached (maximum 100 active documents)"
                in response.json()["detail"]
            )
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# API Integration Tests: Document Lifecycle Router (/documents)
# ---------------------------------------------------------------------------


def test_list_documents(client: TestClient, tenant_a_admin_token: str) -> None:
    """GET /documents returns list of active documents for tenant."""
    doc_id = uuid.uuid4()
    doc_model = DocumentModel(
        doc_id=doc_id,
        tenant_id=uuid.UUID(TENANT_A),
        owner_id=uuid.UUID(USER_FINANCE_ID),
        filename="financial_report.pdf",
        title="Financial Report 2026",
        mime_type="application/pdf",
        file_size_bytes=1024,
        chunk_count=12,
        status="active",
        access_policy={"is_public": False, "roles": ["finance"]},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [doc_model]
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[get_async_session] = lambda: mock_session
    try:
        response = client.get(
            "/documents",
            headers={"Authorization": f"Bearer {tenant_a_admin_token}"},
        )
        assert response.status_code == 200
        docs = response.json()
        assert len(docs) == 1
        assert docs[0]["doc_id"] == str(doc_id)
        assert docs[0]["title"] == "Financial Report 2026"
        assert docs[0]["access_policy"]["roles"] == ["finance"]
    finally:
        app.dependency_overrides.clear()


def test_patch_document_permissions(client: TestClient, tenant_a_admin_token: str) -> None:
    """PATCH /documents/{id}/permissions updates access policy in DB."""
    doc_id = uuid.uuid4()
    doc_model = DocumentModel(
        doc_id=doc_id,
        tenant_id=uuid.UUID(TENANT_A),
        owner_id=uuid.UUID(USER_FINANCE_ID),
        filename="q3_plan.pdf",
        title="Q3 Plan",
        mime_type="application/pdf",
        file_size_bytes=2048,
        chunk_count=6,
        status="active",
        access_policy={"is_public": False, "roles": ["finance"]},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = doc_model
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[get_async_session] = lambda: mock_session
    try:
        response = client.patch(
            f"/documents/{doc_id}/permissions",
            json={
                "access_policy": {
                    "is_public": False,
                    "roles": ["finance", "executive"],
                }
            },
            headers={"Authorization": f"Bearer {tenant_a_admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_policy"]["roles"] == ["finance", "executive"]
    finally:
        app.dependency_overrides.clear()


def test_delete_document_archives_record(client: TestClient, tenant_a_admin_token: str) -> None:
    """DELETE /documents/{id} soft-deletes (archives) the document."""
    doc_id = uuid.uuid4()
    doc_model = DocumentModel(
        doc_id=doc_id,
        tenant_id=uuid.UUID(TENANT_A),
        owner_id=uuid.UUID(USER_FINANCE_ID),
        filename="memo.txt",
        title="Confidential Memo",
        mime_type="text/plain",
        file_size_bytes=512,
        chunk_count=2,
        status="active",
        access_policy={"is_public": True},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = doc_model
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[get_async_session] = lambda: mock_session
    try:
        response = client.delete(
            f"/documents/{doc_id}",
            headers={"Authorization": f"Bearer {tenant_a_admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "archived"
        assert doc_model.status == "archived"
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# API Integration Tests: Privacy Audit Logs
# ---------------------------------------------------------------------------


def test_hash_query_text_privacy() -> None:
    """Verify SHA-256 hashing for audit privacy."""
    query = "What is the secret acquisition price?"
    expected_hash = hashlib.sha256(query.encode("utf-8")).hexdigest()
    assert hash_query_text(query) == expected_hash
    assert hash_query_text(None) is None


def test_admin_list_audit_logs(client: TestClient, tenant_a_admin_token: str) -> None:
    """GET /admin/audit-logs returns tenant audit logs with hashed queries."""
    event_id = uuid.uuid4()
    log_entry = AuditLog(
        event_id=event_id,
        tenant_id=uuid.UUID(TENANT_A),
        user_id=uuid.UUID(USER_FINANCE_ID),
        action="query",
        chunk_ids=["chunk_1", "chunk_2"],
        query_hash=hash_query_text("Sensitive financial query"),
        ip_address="127.0.0.1",
        created_at=datetime.now(UTC),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [log_entry]
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[get_async_session] = lambda: mock_session
    try:
        response = client.get(
            "/admin/audit-logs",
            headers={"Authorization": f"Bearer {tenant_a_admin_token}"},
        )
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) == 1
        assert logs[0]["action"] == "query"
        assert logs[0]["query_hash"] is not None
        assert "Sensitive financial query" not in str(logs[0])  # Plaintext query is NOT exposed
    finally:
        app.dependency_overrides.clear()
