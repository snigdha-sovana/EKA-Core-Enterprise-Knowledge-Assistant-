"""Enterprise multi-tier rate limiting middleware and decorators based on SlowAPI & Redis."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from src.config import settings

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP, taking X-Forwarded-For and X-Real-IP into account from reverse proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in comma-separated list is the original client IP
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client and hasattr(request.client, "host") and isinstance(request.client.host, str):
        return request.client.host
    return "127.0.0.1"


def get_tenant_user_key(request: Request) -> str:
    """Generate scoped rate limit key based on tenant_id, user_id, or IP."""
    tenant_id = (
        getattr(request.state, "tenant_id", None) or request.headers.get("X-Tenant-ID") or "public"
    )
    user = getattr(request.state, "user", None)
    if user and getattr(user, "sub", None):
        return f"ek:{tenant_id}:user:{user.sub}"
    ip = get_client_ip(request)
    return f"ek:{tenant_id}:ip:{ip}"


def get_auth_key(request: Request) -> str:
    """Dedicated key for authentication rate limiting per client IP to stop brute-forcing."""
    ip = get_client_ip(request)
    return f"ek:auth:ip:{ip}"


def get_role_rate_limit(request: Request) -> str:
    """Dynamically resolve rate limit quota based on RBAC role."""
    user = getattr(request.state, "user", None)
    if not user:
        return settings.rate_limit_anonymous

    if isinstance(user, dict):
        roles = user.get("roles", [])
        if user.get("is_superadmin") or "admin" in roles:
            return settings.rate_limit_admin
        elif "curator" in roles:
            return settings.rate_limit_curator
        elif "viewer" in roles:
            return settings.rate_limit_viewer
    else:
        role = getattr(user, "role", "")
        if isinstance(role, str):
            role = role.lower()
        if role in ("super_admin", "admin"):
            return settings.rate_limit_admin
        elif role == "curator":
            return settings.rate_limit_curator
        elif role == "viewer":
            return settings.rate_limit_viewer
    return settings.rate_limit_viewer


def enterprise_rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
    """RFC 6585 compliant 429 Too Many Requests response handler with retry headers."""
    retry_after = 60
    # slowapi RateLimitExceeded may carry retry-after in detail or headers
    if (
        hasattr(exc, "detail")
        and isinstance(exc.detail, str)
        and "retry after" in exc.detail.lower()
    ):
        try:
            import re

            match = re.search(r"(\d+)", exc.detail)
            if match:
                retry_after = int(match.group(1))
        except Exception:
            pass

    key = get_tenant_user_key(request)
    logger.warning(
        "Rate limit exceeded for client key: %s on %s %s (retry-after: %ds)",
        key,
        request.method,
        request.url.path,
        retry_after,
    )

    headers = {
        "Retry-After": str(retry_after),
        "X-RateLimit-Limit": str(getattr(exc, "limit", "Exceeded")),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": str(int(time.time()) + retry_after),
    }

    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "detail": "Too many requests. Please slow down and try again later.",
            "retry_after": retry_after,
            "path": request.url.path,
        },
        headers=headers,
    )


try:
    import sys

    from slowapi import Limiter
    from slowapi.errors import RateLimitExceeded

    # Use in-memory backend for deterministic test execution, otherwise use Redis
    is_test_env = "pytest" in sys.modules or settings.app_env in ("test", "testing")
    active_storage_uri = (
        "memory://" if is_test_env else (settings.redis_url if settings.redis_url else "memory://")
    )

    limiter = Limiter(
        key_func=get_tenant_user_key,
        default_limits=[settings.rate_limit_viewer],
        storage_uri=active_storage_uri,
        strategy="fixed-window",
        headers_enabled=False,
    )

    _rate_limit_exceeded_handler = enterprise_rate_limit_exceeded_handler


except ImportError:
    logger.info("slowapi package not installed; placeholder rate limiter initialized.")

    class RateLimitExceeded(Exception):  # type: ignore[no-redef]
        """Placeholder exception for RateLimitExceeded."""

        def __init__(self, detail: str = "Rate limit exceeded"):
            self.detail = detail

    def _rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
        return enterprise_rate_limit_exceeded_handler(request, exc)

    class _MockLimiter:
        def __init__(self, *args, **kwargs):
            pass

        def limit(self, *args, **kwargs) -> Callable:
            def decorator(f):
                return f

            return decorator

    limiter = _MockLimiter()  # type: ignore[assignment]
