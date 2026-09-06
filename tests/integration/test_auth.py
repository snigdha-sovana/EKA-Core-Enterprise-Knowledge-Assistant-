"""Integration tests for JWT Authentication, RBAC, and Tenant Isolation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.auth.security import create_access_token, hash_password
from src.db.models.tenant import Tenant
from src.db.models.user import User
from src.db.models.user_tenant_role import UserTenantRole
from tests.integration.conftest import (
    TEST_PASSWORD,
    TEST_TENANT_ID,
    TEST_USER_EMAIL,
    TEST_USER_ID,
)


def test_login_success(client: TestClient, test_user: User) -> None:
    """POST /auth/login with valid credentials returns 200 and access+refresh tokens."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_session.execute.return_value = mock_result

    with patch("src.auth.router.get_async_session", return_value=mock_session):
        app.dependency_overrides[
            getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
        ] = lambda: mock_session

        try:
            response = client.post(
                "/auth/login",
                json={"email": TEST_USER_EMAIL, "password": TEST_PASSWORD},
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["token_type"] == "bearer"
            assert data["tenant_id"] == TEST_TENANT_ID
            assert "viewer" in data["roles"]
        finally:
            app.dependency_overrides.clear()


def test_login_wrong_password_returns_401(client: TestClient, test_user: User) -> None:
    """POST /auth/login with wrong password returns 401 Unauthorized."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_session.execute.return_value = mock_result

    with patch("src.auth.router.get_async_session", return_value=mock_session):
        app.dependency_overrides[
            getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
        ] = lambda: mock_session

        try:
            response = client.post(
                "/auth/login",
                json={"email": TEST_USER_EMAIL, "password": "wrong_password"},
            )
            assert response.status_code == 401
            assert "Incorrect email or password" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


def test_query_without_token_returns_401(client: TestClient) -> None:
    """POST /query without token returns 401 Unauthorized."""
    response = client.post("/query", json={"question": "What is EKA?"})
    assert response.status_code == 401
    assert "Missing authentication credentials" in response.json()["detail"]


def test_query_with_expired_token_returns_401(client: TestClient, expired_token: str) -> None:
    """POST /query with expired token returns 401 Unauthorized."""
    response = client.post(
        "/query",
        json={"question": "What is EKA?"},
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]


def test_query_with_viewer_token_allowed(client: TestClient, viewer_token: str) -> None:
    """POST /query with viewer token passes authentication and role checks."""
    with patch("src.api.app.get_pipeline") as mock_get_pipe:
        mock_pipeline = MagicMock()
        # Must return (answer, citations, abstained, confidence_score)
        mock_pipeline.query_async = AsyncMock(
            return_value=("EKA is an enterprise assistant.", [], False, 0.95)
        )
        mock_get_pipe.return_value = mock_pipeline

        response = client.post(
            "/query",
            json={"question": "What is EKA?"},
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["answer"] == "EKA is an enterprise assistant."


def test_ingest_with_viewer_token_forbidden(client: TestClient, viewer_token: str) -> None:
    """POST /ingest with viewer token returns 403 Forbidden (viewers cannot ingest)."""
    response = client.post(
        "/ingest",
        json={"source": "data/sample.txt", "reset": False},
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert response.status_code == 403
    assert "Action requires one of the following roles" in response.json()["detail"]


def test_ingest_with_curator_token_allowed(client: TestClient, curator_token: str) -> None:
    """POST /ingest with curator token passes role checks."""
    with patch("src.api.app._resolve_ingest_source") as mock_resolve, \
         patch("src.api.app.get_pipeline") as mock_get_pipe:
        mock_resolve.return_value = MagicMock()
        mock_pipeline = MagicMock()
        mock_pipeline.ingest.return_value = 5
        mock_pipeline.stats.return_value = {"chunks_in_store": 5}
        mock_get_pipe.return_value = mock_pipeline

        response = client.post(
            "/ingest",
            json={"source": "data/sample.txt", "reset": False},
            headers={"Authorization": f"Bearer {curator_token}"},
        )
        assert response.status_code == 200
        assert response.json()["chunks_ingested"] == 5


def test_admin_users_with_viewer_token_forbidden(client: TestClient, viewer_token: str) -> None:
    """GET /admin/users with viewer token returns 403 Forbidden."""
    response = client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert response.status_code == 403


def test_admin_users_with_admin_token_allowed(client: TestClient, admin_token: str, test_user: User) -> None:
    """GET /admin/users with admin token returns 200 and list of tenant users."""
    mock_session = AsyncMock()
    mock_role = test_user.tenant_roles[0]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_role]
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 1
        assert users[0]["email"] == TEST_USER_EMAIL
        assert users[0]["role"] == "viewer"
    finally:
        app.dependency_overrides.clear()


def test_refresh_tokens_success(client: TestClient, valid_refresh_token: str, test_user: User) -> None:
    """POST /auth/refresh with valid refresh token rotates and returns new tokens."""
    mock_session = AsyncMock()
    mock_session.get.return_value = test_user

    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": valid_refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["access_token"] != valid_refresh_token
    finally:
        app.dependency_overrides.clear()


def test_refresh_tokens_expired_returns_401(client: TestClient, expired_refresh_token: str) -> None:
    """POST /auth/refresh with expired refresh token returns 401 Unauthorized."""
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": expired_refresh_token},
    )
    assert response.status_code == 401
    assert "Invalid or expired refresh token" in response.json()["detail"]


def test_get_me_profile(client: TestClient, viewer_token: str, test_user: User) -> None:
    """GET /auth/me returns authenticated user info and roles."""
    mock_session = AsyncMock()
    mock_session.get.return_value = test_user

    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert "viewer" in data["roles"]
    finally:
        app.dependency_overrides.clear()
