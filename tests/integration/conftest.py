"""Pytest fixtures for EKA integration and authentication tests."""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token, create_refresh_token, hash_password
from src.db.models.tenant import Tenant
from src.db.models.user import User
from src.db.models.user_tenant_role import UserTenantRole

# Stable UUIDs for tests
TEST_TENANT_ID = str(uuid.uuid4())
TEST_USER_ID = str(uuid.uuid4())
TEST_USER_EMAIL = "testuser@example.com"
TEST_PASSWORD = "testpassword123"


@pytest.fixture
def test_tenant() -> Tenant:
    """Mock tenant model instance."""
    return Tenant(
        tenant_id=uuid.UUID(TEST_TENANT_ID),
        slug="test-tenant",
        name="Test Tenant Org",
        status="active",
        doc_cap=100,
        config={},
    )


@pytest.fixture
def test_user(test_tenant: Tenant) -> User:
    """Mock user model instance with tenant role."""
    user = User(
        user_id=uuid.UUID(TEST_USER_ID),
        email=TEST_USER_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        display_name="Test User",
        is_active=True,
        is_superadmin=False,
    )
    role = UserTenantRole(
        user_id=user.user_id,
        tenant_id=test_tenant.tenant_id,
        role="viewer",
    )
    role.tenant = test_tenant
    role.user = user
    user.tenant_roles = [role]
    return user


@pytest.fixture
def viewer_token() -> str:
    """JWT access token with viewer role."""
    return create_access_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["viewer"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def curator_token() -> str:
    """JWT access token with curator role."""
    return create_access_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["curator"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def admin_token() -> str:
    """JWT access token with admin role."""
    return create_access_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["admin"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def superadmin_token() -> str:
    """JWT access token with superadmin role."""
    return create_access_token(
        {
            "sub": TEST_USER_ID,
            "email": "superadmin@example.com",
            "tenant_id": str(uuid.UUID(int=0)),
            "roles": ["admin"],
            "is_superadmin": True,
        }
    )


@pytest.fixture
def expired_token() -> str:
    """Expired JWT access token."""
    return create_access_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["viewer"],
            "is_superadmin": False,
        },
        expires_delta=timedelta(seconds=-60),
    )


@pytest.fixture
def valid_refresh_token() -> str:
    """Valid JWT refresh token."""
    return create_refresh_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["viewer"],
            "is_superadmin": False,
        }
    )


@pytest.fixture
def expired_refresh_token() -> str:
    """Expired JWT refresh token."""
    return create_refresh_token(
        {
            "sub": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "tenant_id": TEST_TENANT_ID,
            "roles": ["viewer"],
            "is_superadmin": False,
        },
        expires_delta=timedelta(seconds=-60),
    )


@pytest.fixture
def client() -> TestClient:
    """Unauthenticated TestClient."""
    return TestClient(app)
