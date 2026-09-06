"""Pydantic schemas for authentication and authorization."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """User login credentials request."""
    email: EmailStr
    password: str
    tenant_slug: str | None = Field(
        default=None,
        description="Optional tenant slug to log into; if omitted, defaults to user's first tenant.",
    )


class TokenResponse(BaseModel):
    """Token response returned upon successful authentication."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    tenant_id: str
    roles: List[str]


class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: str  # user_id
    email: str
    tenant_id: str
    roles: List[str]
    is_superadmin: bool = False
    iss: str
    aud: str
    exp: int
    jti: str | None = None


class UserResponse(BaseModel):
    """User profile response."""
    user_id: uuid.UUID
    email: str
    display_name: str
    is_active: bool
    is_superadmin: bool
    tenant_id: str | None = None
    roles: List[str] = []
