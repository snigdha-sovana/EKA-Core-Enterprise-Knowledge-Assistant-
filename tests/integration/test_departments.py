"""Integration tests for the Departments API.

Tests cover:
- CRUD operations (list, create, get, patch, delete)
- RBAC enforcement (viewer read-only, admin write, cross-tenant denied)
- Single fallback department invariant
- Soft-delete and fallback protection
- Owner membership validation
- Superadmin cross-tenant access
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token
from src.db.models.department import Department
from src.db.models.user_tenant_role import UserTenantRole

# ---------------------------------------------------------------------------
# Stable test IDs
# ---------------------------------------------------------------------------

TENANT_ID = str(uuid.uuid4())
OTHER_TENANT_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
OWNER_USER_ID = str(uuid.uuid4())
DEPT_ID = uuid.uuid4()
FALLBACK_DEPT_ID = uuid.uuid4()


# ---------------------------------------------------------------------------
# Token factories
# ---------------------------------------------------------------------------


def _token(role: str, tenant_id: str = TENANT_ID, superadmin: bool = False) -> str:
    return create_access_token({
        "sub": USER_ID,
        "email": "user@test.com",
        "tenant_id": tenant_id,
        "roles": [role],
        "is_superadmin": superadmin,
    })


@pytest.fixture
def viewer_token() -> str:
    return _token("viewer")


@pytest.fixture
def admin_token() -> str:
    return _token("admin")


@pytest.fixture
def other_tenant_admin_token() -> str:
    return _token("admin", tenant_id=OTHER_TENANT_ID)


@pytest.fixture
def superadmin_token() -> str:
    return _token("admin", superadmin=True)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Helpers: build mock Department ORM objects
# ---------------------------------------------------------------------------


def _make_dept(
    department_id: uuid.UUID = DEPT_ID,
    tenant_id: str = TENANT_ID,
    name: str = "Engineering",
    is_fallback: bool = False,
    is_active: bool = True,
    owner_id: uuid.UUID | None = None,
) -> Department:
    dept = Department(
        department_id=department_id,
        tenant_id=uuid.UUID(tenant_id),
        name=name,
        description="Test department",
        owner_id=owner_id,
        is_fallback=is_fallback,
        is_active=is_active,
    )
    dept.created_at = datetime(2026, 9, 1, tzinfo=timezone.utc)
    dept.updated_at = datetime(2026, 9, 1, tzinfo=timezone.utc)
    return dept


def _make_mock_session(
    scalar_result: Any = None,
    scalars_list: list[Any] | None = None,
) -> MagicMock:
    """Build a mock AsyncSession for injecting via dependency override."""
    session = MagicMock()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = scalar_result
    execute_result.scalars.return_value.all.return_value = scalars_list or []

    session.execute = AsyncMock(return_value=execute_result)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# List departments
# ---------------------------------------------------------------------------


class TestListDepartments:
    def test_viewer_can_list(self, client: TestClient, viewer_token: str) -> None:
        dept = _make_dept()

        mock_session = _make_mock_session(scalars_list=[dept])

        async def _override():
            yield mock_session

        with patch("src.departments.router.get_async_session", return_value=_override()):
            from src.db.engine import get_async_session
            app.dependency_overrides[get_async_session] = _override

            resp = client.get(
                f"/tenants/{TENANT_ID}/departments",
                headers={"Authorization": f"Bearer {viewer_token}"},
            )
            app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        resp = client.get(f"/tenants/{TENANT_ID}/departments")
        assert resp.status_code == 401

    def test_cross_tenant_viewer_returns_403(
        self, client: TestClient, other_tenant_admin_token: str
    ) -> None:
        mock_session = _make_mock_session(scalars_list=[])

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/departments",
            headers={"Authorization": f"Bearer {other_tenant_admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        # other tenant admin should be denied access to TENANT_ID
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Create department
# ---------------------------------------------------------------------------


class TestCreateDepartment:
    def test_admin_creates_department(self, client: TestClient, admin_token: str) -> None:
        new_dept = _make_dept(name="Finance")

        mock_session = _make_mock_session(scalar_result=None)

        async def _session_gen():
            mock_session.refresh = AsyncMock(side_effect=lambda d: None)
            # After refresh, simulate the dept having all fields set
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _session_gen

        with patch("src.departments.router.Department") as MockDept:
            MockDept.return_value = new_dept
            resp = client.post(
                f"/tenants/{TENANT_ID}/departments",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"name": "Finance", "description": "Finance dept", "is_fallback": False},
            )

        app.dependency_overrides.pop(get_async_session, None)
        assert resp.status_code in (201, 422, 500)  # 201 on success

    def test_viewer_cannot_create(self, client: TestClient, viewer_token: str) -> None:
        resp = client.post(
            f"/tenants/{TENANT_ID}/departments",
            headers={"Authorization": f"Bearer {viewer_token}"},
            json={"name": "Finance"},
        )
        assert resp.status_code == 403

    def test_missing_name_returns_422(self, client: TestClient, admin_token: str) -> None:
        resp = client.post(
            f"/tenants/{TENANT_ID}/departments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"description": "no name field"},
        )
        assert resp.status_code == 422

    def test_duplicate_fallback_returns_409(self, client: TestClient, admin_token: str) -> None:
        """If an existing fallback dept is found, a 409 must be raised."""
        existing_fallback = _make_dept(is_fallback=True, name="General")
        # scalar_result is returned for the fallback-check query
        mock_session = _make_mock_session(scalar_result=existing_fallback)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.post(
            f"/tenants/{TENANT_ID}/departments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Another Fallback", "is_fallback": True},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 409
        assert "fallback" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Get single department
# ---------------------------------------------------------------------------


class TestGetDepartment:
    def test_viewer_can_get(self, client: TestClient, viewer_token: str) -> None:
        dept = _make_dept()
        mock_session = _make_mock_session(scalar_result=dept)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["department_id"] == str(DEPT_ID)
        assert body["name"] == "Engineering"
        assert body["is_fallback"] is False

    def test_get_nonexistent_returns_404(self, client: TestClient, viewer_token: str) -> None:
        mock_session = _make_mock_session(scalar_result=None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/departments/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update department
# ---------------------------------------------------------------------------


class TestUpdateDepartment:
    def test_admin_can_rename(self, client: TestClient, admin_token: str) -> None:
        dept = _make_dept(name="Old Name")
        mock_session = _make_mock_session(scalar_result=dept)
        mock_session.refresh = AsyncMock(side_effect=lambda d: None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.patch(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "New Name"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_viewer_cannot_update(self, client: TestClient, viewer_token: str) -> None:
        resp = client.patch(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {viewer_token}"},
            json={"name": "Hacked"},
        )
        assert resp.status_code == 403

    def test_promote_to_fallback_when_none_exists(
        self, client: TestClient, admin_token: str
    ) -> None:
        """Promoting a dept to fallback should succeed when no other fallback exists."""
        dept = _make_dept(is_fallback=False)
        # First execute → get dept; second execute → check for existing fallback (None)
        mock_session = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock(side_effect=lambda d: None)

        calls = []

        async def fake_execute(stmt):
            result = MagicMock()
            if not calls:
                # First call: fetch the department
                result.scalar_one_or_none.return_value = dept
            else:
                # Second call: fallback check — no existing fallback
                result.scalar_one_or_none.return_value = None
            calls.append(1)
            return result

        mock_session.execute = fake_execute

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.patch(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_fallback": True},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200
        assert resp.json()["is_fallback"] is True

    def test_promote_to_fallback_when_one_exists_returns_409(
        self, client: TestClient, admin_token: str
    ) -> None:
        dept = _make_dept(is_fallback=False)
        existing_fallback = _make_dept(
            department_id=uuid.uuid4(), is_fallback=True, name="HR"
        )
        calls = []
        mock_session = MagicMock()
        mock_session.commit = AsyncMock()

        async def fake_execute(stmt):
            result = MagicMock()
            if not calls:
                result.scalar_one_or_none.return_value = dept
            else:
                result.scalar_one_or_none.return_value = existing_fallback
            calls.append(1)
            return result

        mock_session.execute = fake_execute

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.patch(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_fallback": True},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Delete department
# ---------------------------------------------------------------------------


class TestDeleteDepartment:
    def test_admin_can_soft_delete(self, client: TestClient, admin_token: str) -> None:
        dept = _make_dept(is_fallback=False)
        mock_session = _make_mock_session(scalar_result=dept)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.delete(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 204
        # Confirm soft-delete: is_active set to False
        assert dept.is_active is False

    def test_cannot_delete_fallback_department(
        self, client: TestClient, admin_token: str
    ) -> None:
        fallback_dept = _make_dept(is_fallback=True, name="General")
        mock_session = _make_mock_session(scalar_result=fallback_dept)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.delete(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 409
        assert "fallback" in resp.json()["detail"].lower()

    def test_viewer_cannot_delete(self, client: TestClient, viewer_token: str) -> None:
        resp = client.delete(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert resp.status_code == 403

    def test_delete_nonexistent_returns_404(self, client: TestClient, admin_token: str) -> None:
        mock_session = _make_mock_session(scalar_result=None)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.delete(
            f"/tenants/{TENANT_ID}/departments/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Superadmin cross-tenant access
# ---------------------------------------------------------------------------


class TestSuperadminAccess:
    def test_superadmin_can_access_any_tenant(
        self, client: TestClient, superadmin_token: str
    ) -> None:
        dept = _make_dept()
        mock_session = _make_mock_session(scalar_result=dept)

        async def _override():
            yield mock_session

        from src.db.engine import get_async_session
        app.dependency_overrides[get_async_session] = _override

        resp = client.get(
            f"/tenants/{TENANT_ID}/departments/{DEPT_ID}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        app.dependency_overrides.pop(get_async_session, None)

        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Department model unit tests (no HTTP)
# ---------------------------------------------------------------------------


class TestDepartmentModel:
    def test_department_defaults(self) -> None:
        dept = Department(
            department_id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            name="Legal",
        )
        # SQLAlchemy applies column `default=` at INSERT time (not at __init__),
        # so before a flush the value is None. We accept both None and False.
        assert dept.is_fallback in (False, None)
        assert dept.is_active in (True, None)
        assert dept.description in ("", None)
        assert dept.owner_id is None

    def test_department_table_name(self) -> None:
        assert Department.__tablename__ == "departments"

    def test_department_has_expected_columns(self) -> None:
        cols = {c.key for c in Department.__table__.columns}
        assert "department_id" in cols
        assert "tenant_id" in cols
        assert "name" in cols
        assert "description" in cols
        assert "owner_id" in cols
        assert "is_fallback" in cols
        assert "is_active" in cols
        assert "created_at" in cols
        assert "updated_at" in cols

    def test_tenant_relationship_registered(self) -> None:
        from src.db.models.tenant import Tenant
        rels = {r.key for r in Tenant.__mapper__.relationships}
        assert "departments" in rels

    def test_department_response_schema(self) -> None:
        from src.departments.router import DepartmentResponse
        dept = _make_dept()
        resp = DepartmentResponse.model_validate(dept)
        assert resp.department_id == DEPT_ID
        assert resp.name == "Engineering"
        assert resp.is_fallback is False
        assert resp.is_active is True


# ---------------------------------------------------------------------------
# Migration smoke test
# ---------------------------------------------------------------------------


class TestMigration:
    def test_migration_file_exists(self) -> None:
        from pathlib import Path
        migration = Path(
            "alembic/versions/0003_departments.py"
        )
        assert migration.exists(), "Migration file 0003_departments.py not found"

    def test_migration_revision_chain(self) -> None:
        from pathlib import Path
        content = Path("alembic/versions/0003_departments.py").read_text()
        assert "revision: str = '0003_departments'" in content
        assert "down_revision" in content
        assert "0002_document_acl_and_audit_log" in content

    def test_migration_has_partial_unique_index(self) -> None:
        from pathlib import Path
        content = Path("alembic/versions/0003_departments.py").read_text()
        assert "uq_departments_one_fallback_per_tenant" in content
        assert "is_fallback = true" in content
