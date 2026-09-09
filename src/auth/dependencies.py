"""FastAPI dependencies for authentication, role verification, and tenant context."""

from __future__ import annotations

import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from src.auth.schemas import TokenPayload
from src.auth.security import JWTError, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
) -> TokenPayload:
    """Extract and validate JWT Bearer token from request."""
    # Check Authorization header if oauth2_scheme returned None
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Store user and tenant context in request state
    request.state.user = payload
    request.state.tenant_id = payload.tenant_id

    return payload


def require_role(*allowed_roles: str) -> Callable:
    """Factory returning a dependency that enforces RBAC roles.

    Superadmins and tenant 'admin' roles implicitly pass all checks.
    """

    async def role_checker(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if user.is_superadmin or "admin" in user.roles:
            return user

        for role in allowed_roles:
            if role in user.roles:
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action requires one of the following roles: {list(allowed_roles)}.",
        )

    return role_checker


async def require_superadmin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    """Enforce that the requesting user is a superadmin."""
    if not user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin privileges required.",
        )
    return user


async def get_tenant_id(user: TokenPayload = Depends(get_current_user)) -> uuid.UUID:
    """Extract tenant_id as a UUID from the authenticated user token."""
    try:
        return uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID in token payload.",
        )
