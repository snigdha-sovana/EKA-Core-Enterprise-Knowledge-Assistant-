"""Escalation Case database model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.models.base import Base, TimestampMixin


class EscalationCase(Base, TimestampMixin):
    """A durable record created when a query cannot be answered from the vector store.

    Lifecycle:
        open → resolved          (department owner uploads a source document)
        open → classification_failed  (LLM could not determine a department)

    A case is linked to exactly one department and one user (the person who asked
    the unanswerable question). Resolution requires a ``resolution_doc_id`` pointing
    to a document that has been ingested and indexed in response to this case.
    """

    __tablename__ = "escalation_cases"

    case_id: Mapped[uuid.UUID] = mapped_column(
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
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.department_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Privacy: store raw query for department owner context; audit log keeps hash only
    query_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    query_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="open",
        index=True,
    )
    classification_reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    confidence_score: Mapped[float | None] = mapped_column(
        nullable=True,
    )
    # Resolution fields — populated when status transitions to "resolved"
    resolution_doc_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.doc_id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    tenant: Mapped[Tenant] = relationship(  # noqa: F821
        "Tenant",
        foreign_keys=[tenant_id],
    )
    department: Mapped[Department | None] = relationship(  # noqa: F821
        "Department",
        foreign_keys=[department_id],
    )
    user: Mapped[User | None] = relationship(  # noqa: F821
        "User",
        foreign_keys=[user_id],
    )
    resolution_doc: Mapped[DocumentModel | None] = relationship(  # noqa: F821
        "DocumentModel",
        foreign_keys=[resolution_doc_id],
    )
    resolver: Mapped[User | None] = relationship(  # noqa: F821
        "User",
        foreign_keys=[resolved_by],
    )
