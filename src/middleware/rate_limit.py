"""Rate limiting middleware and decorators based on SlowAPI."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import Request

from src.config import settings

logger = logging.getLogger(__name__)


def get_tenant_user_key(request: Request) -> str:
    """Generate rate limit key based on tenant_id, user_id, or IP."""
    tenant_id = getattr(request.state, "tenant_id", "public")
    user = getattr(request.state, "user", None)
    if user:
        return f"ek:{tenant_id}:user:{user.sub}"
    client = request.client
    ip = client.host if client else "127.0.0.1"
    return f"ek:{tenant_id}:ip:{ip}"


try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(
        key_func=get_tenant_user_key,
        default_limits=[settings.rate_limit_viewer],
        storage_uri=settings.redis_url if settings.redis_url else "memory://",
        strategy="fixed-window",
    )
except ImportError:
    logger.info("slowapi package not installed; placeholder rate limiter initialized.")

    class RateLimitExceeded(Exception):
        pass

    def _rate_limit_exceeded_handler(request: Request, exc: Exception):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded."})

    class _MockLimiter:
        def __init__(self, *args, **kwargs):
            pass

        def limit(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator

    limiter = _MockLimiter()  # type: ignore
