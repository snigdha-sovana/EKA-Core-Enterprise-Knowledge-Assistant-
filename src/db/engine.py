"""SQLAlchemy 2.0 Async database engine and session management."""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import settings

logger = logging.getLogger(__name__)

engine: AsyncEngine | None = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the global async engine, initializing it if necessary."""
    global engine, AsyncSessionLocal
    if engine is None:
        engine = create_async_engine(
            settings.database_url,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_pre_ping=True,
            echo=(settings.app_env == "development"),
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        logger.info("Database async engine initialized.")
    return engine


async def init_db_engine() -> None:
    """Initialize database connection pool on application startup."""
    get_engine()


async def close_db_engine() -> None:
    """Dispose database connection pool on application shutdown."""
    global engine, AsyncSessionLocal
    if engine is not None:
        await engine.dispose()
        engine = None
        AsyncSessionLocal = None
        logger.info("Database async engine disposed.")


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for obtaining an asynchronous database session."""
    if AsyncSessionLocal is None:
        get_engine()
    assert AsyncSessionLocal is not None

    async with AsyncSessionLocal() as session:
        try:
            yield session
            try:
                await session.commit()
            except Exception as commit_exc:
                try:
                    await session.rollback()
                except Exception:
                    pass
                logger.warning("Database session commit notice: %s", commit_exc)
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
            raise
