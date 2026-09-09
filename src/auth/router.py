"""Authentication router handling login, token rotation, and current user profile."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.dependencies import get_current_user
from src.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    TokenPayload,
    TokenResponse,
    UserResponse,
)
from src.auth.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from src.config import settings
from src.db.engine import get_async_session
from src.db.models.tenant import Tenant
from src.db.models.user import User
from src.db.models.user_tenant_role import UserTenantRole
from src.middleware.rate_limit import get_auth_key, limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth, key_func=get_auth_key)
async def login(
    request: Request,
    req: LoginRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Authenticate user with email and password, returning JWT access & refresh tokens."""
    # Find user with tenant roles
    stmt = (
        select(User)
        .where(User.email == req.email.lower().strip())
        .options(selectinload(User.tenant_roles).selectinload(UserTenantRole.tenant))
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    # Determine tenant and roles
    target_tenant_id: str | None = None
    user_roles: list[str] = []

    if req.tenant_slug:
        # User explicitly requested a tenant
        matched_role = next(
            (r for r in user.tenant_roles if r.tenant and r.tenant.slug == req.tenant_slug),
            None,
        )
        if not matched_role and not user.is_superadmin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User is not a member of tenant '{req.tenant_slug}'.",
            )
        if matched_role:
            if matched_role.tenant.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tenant '{req.tenant_slug}' is currently {matched_role.tenant.status}.",
                )
            target_tenant_id = str(matched_role.tenant_id)
            user_roles = [matched_role.role]
        elif user.is_superadmin:
            # Superadmin can access any tenant
            tenant_stmt = select(Tenant).where(Tenant.slug == req.tenant_slug)
            t_res = await session.execute(tenant_stmt)
            t = t_res.scalar_one_or_none()
            if not t:
                raise HTTPException(
                    status_code=404, detail=f"Tenant '{req.tenant_slug}' not found."
                )
            target_tenant_id = str(t.tenant_id)
            user_roles = ["admin"]
    else:
        # Default to first active tenant role
        active_role = next(
            (r for r in user.tenant_roles if r.tenant and r.tenant.status == "active"),
            None,
        )
        if active_role:
            target_tenant_id = str(active_role.tenant_id)
            user_roles = [active_role.role]
        elif user.is_superadmin:
            # System tenant for superadmin
            target_tenant_id = str(uuid.UUID(int=0))
            user_roles = ["admin"]
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no active tenant memberships.",
            )

    token_data = {
        "sub": str(user.user_id),
        "email": user.email,
        "tenant_id": target_tenant_id,
        "roles": user_roles,
        "is_superadmin": user.is_superadmin,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_expiry_minutes * 60,
        tenant_id=target_tenant_id,
        roles=user_roles,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    req: RefreshRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Validate refresh token and issue a new token pair."""
    try:
        payload = decode_token(req.refresh_token, audience="eka-refresh")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired refresh token: {str(e)}",
        )

    # Verify user is still active in DB
    user_id = uuid.UUID(payload.sub)
    user = await session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active.",
        )

    # Issue new pair
    token_data = {
        "sub": payload.sub,
        "email": payload.email,
        "tenant_id": payload.tenant_id,
        "roles": payload.roles,
        "is_superadmin": payload.is_superadmin,
    }

    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_expiry_minutes * 60,
        tenant_id=payload.tenant_id,
        roles=payload.roles,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> UserResponse:
    """Return currently authenticated user information and assigned tenant roles."""
    user = await session.get(User, uuid.UUID(current_user.sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        tenant_id=current_user.tenant_id,
        roles=current_user.roles,
    )
