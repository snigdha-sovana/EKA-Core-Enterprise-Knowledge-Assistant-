"""Tenant resolution and isolation middleware."""

from __future__ import annotations

import logging
import uuid
from typing import Set

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from src.auth.security import JWTError, decode_token
from src.cache.redis_client import CacheService
from src.config import settings

logger = logging.getLogger(__name__)

EXEMPT_PATHS: Set[str] = {
    "/auth/login",
    "/auth/refresh",
    "/healthz",
    "/readyz",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc",
}

_IN_MEMORY_TENANT_STATUS: dict[str, str] = {}


class TenantResolutionMiddleware(BaseHTTPMiddleware):
    """Extracts, validates, and sets tenant_id context on request.state for every request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Check if path is exempt
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
            return await call_next(request)

        tenant_id: str | None = None

        # 1. Try extracting from Authorization JWT Bearer header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            try:
                payload = decode_token(token)
                tenant_id = payload.tenant_id
                request.state.user = payload
            except JWTError:
                # Let endpoint or get_current_user handle invalid/expired token
                pass

        # 2. Fallback to X-Tenant-ID header (service accounts or overrides)
        if not tenant_id:
            tenant_id = request.headers.get("X-Tenant-ID")

        if tenant_id:
            # Check tenant status via Redis cache first
            cache_key = f"ek:tenant:{tenant_id}:status"
            cached_status = await CacheService.get(cache_key)

            if cached_status is None:
                cached_status = _IN_MEMORY_TENANT_STATUS.get(tenant_id)

            if cached_status is None:
                # Query DB to check status with timeout
                try:
                    import asyncio
                    from src.db.engine import get_engine
                    from sqlalchemy import text

                    engine = get_engine()

                    async def _check_db():
                        async with engine.connect() as conn:
                            res = await conn.execute(
                                text("SELECT status FROM tenants WHERE tenant_id = :tid"),
                                {"tid": tenant_id},
                            )
                            row = res.fetchone()
                            return row[0] if row else "active"

                    cached_status = await asyncio.wait_for(_check_db(), timeout=1.0)
                except Exception as e:
                    logger.debug("DB tenant verification unavailable or timed out: %s", e)
                    cached_status = "active"

                _IN_MEMORY_TENANT_STATUS[tenant_id] = cached_status
                await CacheService.set(
                    cache_key, cached_status, ex=settings.tenant_cache_ttl_seconds
                )

            if cached_status and cached_status != "active":
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": f"Tenant is {cached_status}."},
                )

            request.state.tenant_id = tenant_id

        return await call_next(request)
