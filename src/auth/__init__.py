"""Authentication and RBAC package for EKA."""

from src.auth.dependencies import (
    get_current_user,
    get_tenant_id,
    require_role,
    require_superadmin,
)
from src.auth.router import router as auth_router
from src.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    TokenPayload,
    TokenResponse,
    UserResponse,
)
from src.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

__all__ = [
    "auth_router",
    "get_current_user",
    "require_role",
    "require_superadmin",
    "get_tenant_id",
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "TokenPayload",
    "UserResponse",
]
