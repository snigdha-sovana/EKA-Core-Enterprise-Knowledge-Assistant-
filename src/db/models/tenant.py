"""Tenant database model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    """Represents an isolated organizational tenant in EKA."""

    __tablename__ = "tenants"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    slug: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
        index=True,
    )
    doc_cap: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
    )
    suspended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    # Relationships
    user_roles: Mapped[list[UserTenantRole]] = relationship(
        "UserTenantRole",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    departments: Mapped[list[Department]] = relationship(
        "Department",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
