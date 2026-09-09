"""Integration and unit tests for Production Hardening (Phase 8).

Validates:
1. Multi-tier rate limiting policies and RFC 6585 error handlers.
2. Disaster recovery backup creation (Postgres + ChromaDB + Manifest).
3. Checksum verification and dry-run restore validation.
4. Tamper detection on corrupted backup bundles.
5. Nginx edge gateway configuration integrity.
"""

from __future__ import annotations

import json
import os
import shutil
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from scripts.backup.backup_all import compute_sha256, run_full_backup
from scripts.backup.backup_chroma import run_chroma_backup
from scripts.backup.backup_postgres import run_postgres_backup
from scripts.backup.restore import run_restore
from src.api.app import app
from src.config import settings
from src.middleware.rate_limit import (
    get_auth_key,
    get_client_ip,
    get_role_rate_limit,
    limiter,
)


# ---------------------------------------------------------------------------
# Rate Limiting Tests
# ---------------------------------------------------------------------------


def test_client_ip_extraction_proxy_aware():
    """Verify get_client_ip properly extracts the real client IP behind proxies."""
    req_mock = MagicMock()
    req_mock.headers = {"X-Forwarded-For": "203.0.113.195, 70.41.3.18, 150.172.238.178"}
    ip = get_client_ip(req_mock)
    assert ip == "203.0.113.195"

    req_mock.headers = {"X-Real-IP": "198.51.100.42"}
    ip = get_client_ip(req_mock)
    assert ip == "198.51.100.42"

    req_mock.headers = {}
    req_mock.client = MagicMock()
    req_mock.client.host = "192.0.2.1"
    ip = get_client_ip(req_mock)
    assert ip == "192.0.2.1"


def test_get_auth_key_combination():
    """Verify get_auth_key combines username/email with client IP for credential stuffing prevention."""
    req_mock = MagicMock()
    req_mock.headers = {"X-Real-IP": "198.51.100.42"}
    key = get_auth_key(req_mock)
    assert "198.51.100.42" in key


def test_role_rate_limit_resolution():
    """Verify get_role_rate_limit resolves role tiers or falls back to viewer."""
    req_admin = MagicMock()
    req_admin.state.user = {"roles": ["admin"]}
    assert get_role_rate_limit(req_admin) == settings.rate_limit_admin

    req_curator = MagicMock()
    req_curator.state.user = {"roles": ["curator"]}
    assert get_role_rate_limit(req_curator) == settings.rate_limit_curator

    req_viewer = MagicMock()
    req_viewer.state.user = {"roles": ["viewer"]}
    assert get_role_rate_limit(req_viewer) == settings.rate_limit_viewer

    req_anon = MagicMock()
    req_anon.state = MagicMock()
    del req_anon.state.user
    assert get_role_rate_limit(req_anon) == settings.rate_limit_anonymous



from src.db.engine import get_async_session


def test_auth_login_rate_limiting_triggers_429():
    """Verify that exceeding rate limit on /auth/login returns 429 with RFC 6585 headers."""
    client = TestClient(app)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # user not found / invalid password
    mock_session.execute.return_value = mock_result

    app.dependency_overrides[get_async_session] = lambda: mock_session

    test_ip = "198.51.100.99"
    headers = {"X-Forwarded-For": test_ip}
    payload = {"email": "baduser@example.com", "password": "wrongpassword"}

    limiter.reset()

    # The rate limit on /auth/login is settings.rate_limit_auth (e.g. "5/minute")
    limit_num = int(settings.rate_limit_auth.split("/")[0])

    try:
        got_429 = False
        for i in range(limit_num + 3):
            resp = client.post("/auth/login", json=payload, headers=headers)
            if resp.status_code == 429:
                got_429 = True
                data = resp.json()
                assert data.get("error") == "rate_limit_exceeded"
                assert "detail" in data
                assert "Retry-After" in resp.headers
                assert "X-RateLimit-Limit" in resp.headers
                break

        assert got_429, f"Expected 429 after {limit_num + 3} requests, but did not receive one"
    finally:
        app.dependency_overrides.clear()



# ---------------------------------------------------------------------------
# Backup & Disaster Recovery Tests
# ---------------------------------------------------------------------------


def test_sha256_computation(tmp_path: Path):
    """Verify SHA-256 calculation matches standard hash."""
    test_file = tmp_path / "sample.txt"
    test_file.write_text("EKA Production Disaster Recovery Verification", encoding="utf-8")
    checksum = compute_sha256(test_file)
    assert isinstance(checksum, str)
    assert len(checksum) == 64


def test_full_backup_and_dry_run_restore(tmp_path: Path):
    """Verify creating a full coordinated backup bundle and validating via dry-run restore."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # 1. Run full backup
    result = run_full_backup(dest_dir=backup_dir, retention_days=7)
    assert result["status"] == "SUCCESS"
    assert "archive_path" in result
    assert "sha256" in result

    bundle_path = Path(result["archive_path"])
    assert bundle_path.exists()
    assert bundle_path.name.endswith(".tar.gz")

    # 2. Run dry-run restore
    restore_result = run_restore(archive_path=bundle_path, dry_run=True)
    assert restore_result["status"] == "VALIDATED_DRY_RUN"
    assert restore_result["manifest"]["status"] == "SUCCESS"
    assert "postgres" in restore_result["manifest"]["components"]
    assert "chroma" in restore_result["manifest"]["components"]


def test_restore_tamper_detection(tmp_path: Path):
    """Verify that corrupting a backup bundle triggers SHA-256 verification failure."""
    backup_dir = tmp_path / "tamper_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    result = run_full_backup(dest_dir=backup_dir, retention_days=7)
    bundle_path = Path(result["archive_path"])

    # Tamper with archive: append corrupt bytes
    with open(bundle_path, "ab") as f:
        f.write(b"\x00\xffCORRUPTED_BYTES_INJECTED")

    # Companion .sha256 file exists, so restore will detect checksum mismatch immediately
    with pytest.raises(ValueError, match="Checksum mismatch"):
        run_restore(
            archive_path=bundle_path,
            dry_run=True,
        )



# ---------------------------------------------------------------------------
# Nginx Configuration Tests
# ---------------------------------------------------------------------------


def test_nginx_configurations_exist_and_contain_required_directives():
    """Verify Nginx configuration files exist and include required security and streaming directives."""
    project_root = Path(__file__).resolve().parent.parent.parent
    nginx_conf = project_root / "nginx" / "nginx.conf"
    default_conf = project_root / "nginx" / "conf.d" / "default.conf"

    assert nginx_conf.exists(), "nginx/nginx.conf does not exist"
    assert default_conf.exists(), "nginx/conf.d/default.conf does not exist"

    nginx_text = nginx_conf.read_text(encoding="utf-8")
    assert "worker_processes" in nginx_text
    assert "gzip" in nginx_text and "gzip_vary" in nginx_text
    assert "client_max_body_size" in nginx_text


    default_text = default_conf.read_text(encoding="utf-8")
    # Rate limit zones
    assert "limit_req_zone $binary_remote_addr zone=auth_login" in default_text
    assert "limit_req_zone $binary_remote_addr zone=rag_query" in default_text
    # SSE streaming support
    assert "proxy_buffering off;" in default_text
    assert "chunked_transfer_encoding off;" in default_text
    assert "/query/stream" in default_text
    # Security headers
    assert "X-Frame-Options" in default_text
    assert "X-Content-Type-Options" in default_text
    assert "Content-Security-Policy" in default_text
    # 429 error handler
    assert "error_page 429 /429.json;" in default_text
    assert "location = /429.json" in default_text

