"""Permission and access-control filtering for retrieval candidates."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """Authentication and role context for the user performing a retrieval query."""

    user_id: str
    tenant_id: str
    roles: List[str] = field(default_factory=list)
    is_superadmin: bool = False

    @property
    def is_admin(self) -> bool:
        return self.is_superadmin or "admin" in self.roles


def can_user_access_chunk(metadata: Dict[str, Any], user: UserContext | None) -> bool:
    """Evaluate whether the given user context is permitted to view a chunk."""
    if user is None:
        # If no user context is provided, only allow public chunks with no tenant restrictions
        is_pub = metadata.get("is_public")
        return is_pub in (True, "true", "True", 1)

    if user.is_superadmin:
        return True

    # 1. Multi-tenant isolation: chunk must belong to user's tenant
    chunk_tenant_id = str(metadata.get("tenant_id", "")).strip()
    if chunk_tenant_id and chunk_tenant_id != str(user.tenant_id).strip():
        return False

    # 2. Exclude archived chunks
    if metadata.get("status") == "archived":
        return False

    # 3. Tenant administrator has access to all active documents in their tenant
    if user.is_admin:
        return True

    # 4. Public document check
    is_pub = metadata.get("is_public")
    if is_pub in (True, "true", "True", 1, "1"):
        return True

    # 5. Check allowed users
    allowed_users_raw = str(metadata.get("allowed_users", ""))
    target_user_marker = f",{str(user.user_id).lower()},"
    if target_user_marker in allowed_users_raw.lower():
        return True

    # 6. Check allowed roles
    allowed_roles_raw = str(metadata.get("allowed_roles", ""))
    for role in user.roles:
        role_marker = f",{role.lower().strip()},"
        if role_marker in allowed_roles_raw.lower():
            return True

    return False


def filter_chunks_by_access(
    chunks: List[Dict[str, Any]], user: UserContext | None
) -> List[Dict[str, Any]]:
    """Filter candidate retrieval chunks, dropping any that fail the access policy."""
    if user is None:
        return [c for c in chunks if can_user_access_chunk(c.get("metadata", {}), None)]

    allowed: List[Dict[str, Any]] = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        if can_user_access_chunk(meta, user):
            allowed.append(chunk)

    return allowed


def build_chroma_where_clause(user: UserContext | None) -> Dict[str, Any] | None:
    """Build a ChromaDB where filter that constrains queries to the user's tenant."""
    if user is None:
        return {"is_public": "true"}

    if user.is_superadmin:
        return None

    return {"tenant_id": str(user.tenant_id)}
