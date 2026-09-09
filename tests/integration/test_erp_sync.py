"""Integration tests for ERP Mock Connector & Sync."""

import hmac
import json
from typing import Any
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.config import settings
from tests.integration.conftest import TEST_TENANT_ID


def test_trigger_erp_sync(client: TestClient, curator_token: str):
    """Test on-demand ERP sync reconciliation."""
    mock_session = AsyncMock()
    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        mock_summary = {
            "tenant_id": TEST_TENANT_ID,
            "added": 3,
            "updated": 0,
            "failed": 0
        }
        
        with patch("src.erp.router.ERPSyncService.reconcile_tenant", new_callable=AsyncMock) as mock_reconcile:
            mock_reconcile.return_value = MagicMock(to_dict=lambda: mock_summary)

            response = client.post(
                f"/tenants/{TEST_TENANT_ID}/erp/sync",
                headers={"Authorization": f"Bearer {curator_token}", "X-Tenant-Slug": "test-tenant"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert data["summary"]["added"] == 3

        with patch("src.erp.router.ERPSyncService.get_sync_status", new_callable=AsyncMock) as mock_status:
            mock_status.return_value = {
                "tenant_id": TEST_TENANT_ID,
                "source_system": "mock_erp",
                "total_tracked": 3,
                "active_synced": 3,
                "deleted": 0,
                "failed": 0,
                "last_synced_at": None,
                "department_counts": {}
            }
            
            status_res = client.get(
                f"/tenants/{TEST_TENANT_ID}/erp/sync-status",
                headers={"Authorization": f"Bearer {curator_token}", "X-Tenant-Slug": "test-tenant"}
            )
            assert status_res.status_code == 200
            status_data = status_res.json()
            assert status_data["active_synced"] == 3
    finally:
        app.dependency_overrides.clear()


def test_erp_webhook_signature_verification(client: TestClient, curator_token: str):
    """Test that webhook endpoint validates HMAC signature properly."""
    mock_session = AsyncMock()
    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        payload = {
            "event": "record.updated",
            "record": {
                "external_record_id": "ERP-999",
                "title": "Webhook Test Document",
                "content": "This came from a webhook."
            }
        }
        payload_bytes = json.dumps(payload).encode("utf-8")
        
        # 1. Test missing signature
        res1 = client.post(
            "/erp/webhook",
            content=payload_bytes,
            headers={"X-ERP-Tenant-ID": TEST_TENANT_ID}
        )
        assert res1.status_code == 401

        # 2. Test invalid signature
        res2 = client.post(
            "/erp/webhook",
            content=payload_bytes,
            headers={"X-ERP-Tenant-ID": TEST_TENANT_ID, "X-ERP-Signature": "invalid_signature_hash"}
        )
        assert res2.status_code == 401

        # 3. Test valid signature
        import hashlib
        secret = settings.jwt_secret_key.encode("utf-8")
        valid_sig = hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()

        with patch("src.erp.router.ERPSyncService.handle_webhook", new_callable=AsyncMock) as mock_handle:
            mock_handle.return_value = {"status": "processed", "external_record_id": "ERP-999"}
            res3 = client.post(
                "/erp/webhook",
                content=payload_bytes,
                headers={"X-ERP-Tenant-ID": TEST_TENANT_ID, "X-ERP-Signature": valid_sig}
            )
            assert res3.status_code == 200
            assert res3.json()["status"] == "processed"
            assert res3.json()["external_record_id"] == "ERP-999"
    finally:
        app.dependency_overrides.clear()


def test_tenant_dashboard(client: TestClient, curator_token: str):
    """Test unified dashboard aggregation."""
    mock_session = AsyncMock()
    
    # Mock knowledge base count
    mock_doc_row = MagicMock()
    mock_doc_row.active_docs = 10
    mock_doc_row.archived_docs = 2
    
    # Mock escalation count
    mock_esc_row = MagicMock()
    mock_esc_row.open_cases = 1
    mock_esc_row.resolved_cases = 5
    
    # Mock fallback dept name
    mock_fallback_name = "Engineering"
    
    # Setup execute side_effects
    def execute_side_effect(stmt):
        mock_result = MagicMock()
        stmt_str = str(stmt).lower()
        if "documents" in stmt_str:
            mock_result.first.return_value = mock_doc_row
        elif "escalation_cases" in stmt_str:
            mock_result.first.return_value = mock_esc_row
        elif "departments" in stmt_str:
            mock_result.scalar_one_or_none.return_value = mock_fallback_name
        elif "audit_logs" in stmt_str:
            mock_result.scalars.return_value.all.return_value = []
        return mock_result

    mock_session.execute.side_effect = execute_side_effect

    app.dependency_overrides[
        getattr(__import__("src.db.engine", fromlist=["get_async_session"]), "get_async_session")
    ] = lambda: mock_session

    try:
        with patch("src.erp.router.ERPSyncService.get_sync_status", new_callable=AsyncMock) as mock_status:
            mock_status.return_value = {
                "tenant_id": TEST_TENANT_ID,
                "source_system": "mock_erp",
                "total_tracked": 3,
                "active_synced": 3,
                "deleted": 0,
                "failed": 0,
                "last_synced_at": None,
                "department_counts": {}
            }
            
            res = client.get(
                f"/tenants/{TEST_TENANT_ID}/dashboard",
                headers={"Authorization": f"Bearer {curator_token}", "X-Tenant-Slug": "test-tenant"}
            )
            assert res.status_code == 200
            data = res.json()
            assert data["tenant_id"] == TEST_TENANT_ID
            assert data["knowledge_base"]["active_documents"] == 10
            assert data["escalation_queue"]["open_cases"] == 1
    finally:
        app.dependency_overrides.clear()
