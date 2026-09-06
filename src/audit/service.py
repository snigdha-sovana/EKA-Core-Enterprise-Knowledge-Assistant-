"""Audit logging service for tracking ingestion, retrieval, and access control events."""

from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.engine import AsyncSessionLocal
from src.db.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def hash_query_text(query: str | None) -> str | None:
    """Compute SHA-256 hash of query text for privacy-preserving audit logs."""
    if not query:
        return None
    return hashlib.sha256(query.strip().encode("utf-8")).hexdigest()


class AuditService:
    """Service providing append-only audit event logging."""

    @staticmethod
    async def log_event(
        tenant_id: str | uuid.UUID,
        action: str,
        user_id: str | uuid.UUID | None = None,
        document_id: str | uuid.UUID | None = None,
        chunk_ids: List[str] | None = None,
        query_text: str | None = None,
        ip_address: str | None = None,
        session: AsyncSession | None = None,
    ) -> AuditLog | None:
        """Record an access or lifecycle event to the audit log."""
        try:
            tid = uuid.UUID(str(tenant_id))
            uid = uuid.UUID(str(user_id)) if user_id else None
            did = uuid.UUID(str(document_id)) if document_id else None
        except ValueError as e:
            logger.warning("Invalid UUID passed to AuditService.log_event: %s", e)
            return None

        event = AuditLog(
            event_id=uuid.uuid4(),
            tenant_id=tid,
            user_id=uid,
            action=action,
            document_id=did,
            chunk_ids=chunk_ids or [],
            query_hash=hash_query_text(query_text),
            ip_address=ip_address,
        )

        try:
            if session is not None:
                session.add(event)
                await session.flush()
                return event
            else:
                if AsyncSessionLocal is None:
                    return event
                async with AsyncSessionLocal() as db:
                    db.add(event)
                    await db.commit()
                return event
        except Exception as exc:
            logger.warning("Failed to record audit log event (%s): %s", action, exc)
            if session is not None:
                try:
                    await session.rollback()
                except Exception:
                    pass
            return None
