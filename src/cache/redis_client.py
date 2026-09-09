"""Async Redis client with connection pooling and graceful degradation."""

from __future__ import annotations

import logging
from typing import Any

try:
    import redis.asyncio as aioredis
    from redis.exceptions import ConnectionError, RedisError, TimeoutError
except ImportError:
    aioredis = None  # type: ignore[assignment]

    class RedisError(Exception):  # type: ignore[no-redef]
        pass

    class ConnectionError(RedisError):  # type: ignore[no-redef]
        pass

    class TimeoutError(RedisError):  # type: ignore[no-redef]
        pass


from src.config import settings

logger = logging.getLogger(__name__)

redis_client: Any = None
_redis_available: bool = True


async def init_redis() -> Any:
    """Initialize Redis connection pool on application startup."""
    global redis_client, _redis_available
    if aioredis is None:
        _redis_available = False
        logger.info("Redis package not installed; cache running in degraded mode.")
        return None

    try:
        redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
        await redis_client.ping()
        _redis_available = True
        logger.info("Redis client connected successfully.")
        return redis_client
    except (ConnectionError, TimeoutError, OSError) as e:
        _redis_available = False
        logger.warning(
            "Redis connection failed (%s). System running in cache-degraded mode.",
            str(e),
        )
        return None


async def close_redis() -> None:
    """Close Redis client on shutdown."""
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.aclose()
        except Exception as e:
            logger.debug("Error closing Redis client: %s", e)
        finally:
            redis_client = None
            logger.info("Redis client closed.")


def get_redis() -> Any:
    """Get the active Redis client instance, or None if unavailable."""
    return redis_client if _redis_available else None


class CacheService:
    """High-level caching helper with fallback on cache misses or errors."""

    @staticmethod
    async def get(key: str) -> str | None:
        client = get_redis()
        if client is None:
            return None
        try:
            return await client.get(key)
        except RedisError as e:
            logger.warning("Redis GET error for key %s: %s", key, e)
            return None

    @staticmethod
    async def set(key: str, value: str, ex: int | None = None) -> bool:
        client = get_redis()
        if client is None:
            return False
        try:
            await client.set(key, value, ex=ex)
            return True
        except RedisError as e:
            logger.warning("Redis SET error for key %s: %s", key, e)
            return False

    @staticmethod
    async def delete(key: str) -> bool:
        client = get_redis()
        if client is None:
            return False
        try:
            await client.delete(key)
            return True
        except RedisError as e:
            logger.warning("Redis DELETE error for key %s: %s", key, e)
            return False
