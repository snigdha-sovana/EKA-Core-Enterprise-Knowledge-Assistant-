"""Department database model."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.models.base import Base, TimestampMixin


class Department(Base, TimestampMixin):
    """A tenant-scoped department that owns a slice of enterprise knowledge.

    Rules:
    - Every tenant must have exactly one fallback department (``is_fallback=True``).
    - A department has one owner user (a tenant admin or curator).
    - Documents and vector chunks are optionally tagged with a ``department_id``.
    - Escalation cases are routed to the owning department when a query cannot
      be answered from the vector store.
    """

    __tablename__ = "departments"

    department_id: Mapped[uuid.UUID] = mapped_column(
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
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_fallback: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(  # noqa: F821
        "Tenant",
        back_populates="departments",
        foreign_keys=[tenant_id],
    )
    owner: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[owner_id],
    )
