"""Access control policy schemas and metadata formatting for documents and chunks."""

from __future__ import annotations

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class AccessPolicy(BaseModel):
    """Document access control policy specifying allowed roles, users, and public visibility."""

    roles: List[str] = Field(
        default_factory=list,
        description="List of RBAC roles permitted to access chunks from this document.",
    )
    user_ids: List[str] = Field(
        default_factory=list,
        description="Explicit user IDs permitted to access chunks from this document.",
    )
    is_public: bool = Field(
        default=True,
        description="If True, any user within the tenant can access this document regardless of roles.",
    )


def format_list_for_storage(items: List[str]) -> str:
    """Format a list of strings into a comma-delimited string with leading/trailing commas.

    Enables exact substring matches, e.g. ',hr,' inside ',hr,finance,'.
    """
    clean_items = [item.strip().lower() for item in items if item.strip()]
    if not clean_items:
        return ""
    return f",{','.join(clean_items)},"


def build_chunk_acl_metadata(
    tenant_id: str,
    doc_id: str,
    policy: AccessPolicy | None = None,
    status: str = "active",
    department_id: str | None = None,
    source_system: str | None = None,
) -> Dict[str, Any]:
    """Convert an AccessPolicy into flat key-value pairs suitable for vector store metadata."""
    p = policy or AccessPolicy()
    meta: Dict[str, Any] = {
        "tenant_id": str(tenant_id),
        "doc_id": str(doc_id),
        "is_public": "true" if p.is_public else "false",
        "allowed_roles": format_list_for_storage(p.roles),
        "allowed_users": format_list_for_storage(p.user_ids),
        "status": status,
    }
    if department_id:
        meta["department_id"] = str(department_id)
    if source_system:
        meta["source_system"] = str(source_system)
    return meta

