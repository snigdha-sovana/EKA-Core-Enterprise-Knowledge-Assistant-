"""ERP Sync Record database model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.models.base import Base, TimestampMixin


class ERPSyncRecord(Base, TimestampMixin):
    """Tracks external ERP records synchronized into EKA.

    Maps an external ERP entity (e.g. from SAP, NetSuite, or MockERP) to an internal
    DocumentModel and vector store chunks, maintaining content hashes for change
    detection, last sync timestamps, and deletion state.
    """

    __tablename__ = "erp_sync_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "source_system",
            "external_record_id",
            name="uq_erp_sync_tenant_source_record",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_system: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="mock_erp",
        index=True,
    )
    external_record_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="document",
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )
    version_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="",
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.doc_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.department_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    sync_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="synced",
        index=True,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    sync_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    raw_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    # Relationships
    tenant: Mapped[Tenant] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
    )
    document: Mapped[DocumentModel | None] = relationship(  # noqa: F821
        "DocumentModel",
        foreign_keys=[document_id],
    )
    department: Mapped[Department | None] = relationship(  # noqa: F821
        "Department",
        foreign_keys=[department_id],
    )
