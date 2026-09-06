"""Document lifecycle management router."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.audit.service import AuditService
from src.auth.dependencies import get_current_user, require_role
from src.auth.schemas import TokenPayload
from src.db.engine import get_async_session
from src.db.models.document import DocumentModel
from src.ingestion.access_control import AccessPolicy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentResponse(BaseModel):
    """Document metadata response."""

    doc_id: uuid.UUID
    tenant_id: uuid.UUID
    owner_id: uuid.UUID | None = None
    filename: str
    title: str
    mime_type: str
    file_size_bytes: int
    chunk_count: int
    status: str
    access_policy: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UpdatePermissionsRequest(BaseModel):
    """Request schema for updating document access permissions."""

    access_policy: AccessPolicy


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    status_filter: str = Query("active", alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> List[DocumentResponse]:
    """List documents in the current tenant accessible to the user."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = select(DocumentModel).where(
        DocumentModel.tenant_id == tenant_uuid,
        DocumentModel.status == status_filter,
    )

    result = await session.execute(stmt.offset(skip).limit(limit))
    docs = result.scalars().all()

    # Filter documents according to user permissions unless admin/curator
    is_privileged = user.is_superadmin or "admin" in user.roles or "curator" in user.roles
    accessible_docs = []

    for doc in docs:
        if is_privileged:
            accessible_docs.append(doc)
            continue

        policy = doc.access_policy or {}
        if policy.get("is_public", True):
            accessible_docs.append(doc)
            continue

        if user.sub in policy.get("user_ids", []):
            accessible_docs.append(doc)
            continue

        doc_roles = policy.get("roles", [])
        if any(r in doc_roles for r in user.roles):
            accessible_docs.append(doc)

    return [
        DocumentResponse(
            doc_id=d.doc_id,
            tenant_id=d.tenant_id,
            owner_id=d.owner_id,
            filename=d.filename,
            title=d.title,
            mime_type=d.mime_type,
            file_size_bytes=d.file_size_bytes,
            chunk_count=d.chunk_count,
            status=d.status,
            access_policy=d.access_policy,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in accessible_docs
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentResponse:
    """Retrieve metadata and access policy for a specific document."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = select(DocumentModel).where(
        DocumentModel.doc_id == doc_id,
        DocumentModel.tenant_id == tenant_uuid,
    )
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Check permission
    is_privileged = user.is_superadmin or "admin" in user.roles or "curator" in user.roles
    if not is_privileged:
        policy = doc.access_policy or {}
        allowed = (
            policy.get("is_public", True)
            or user.sub in policy.get("user_ids", [])
            or any(r in policy.get("roles", []) for r in user.roles)
        )
        if not allowed:
            raise HTTPException(status_code=404, detail="Document not found.")

    return DocumentResponse(
        doc_id=doc.doc_id,
        tenant_id=doc.tenant_id,
        owner_id=doc.owner_id,
        filename=doc.filename,
        title=doc.title,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        status=doc.status,
        access_policy=doc.access_policy,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.patch("/{doc_id}/permissions", response_model=DocumentResponse)
async def update_document_permissions(
    doc_id: uuid.UUID,
    req: UpdatePermissionsRequest,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentResponse:
    """Update document access control policy (curator, admin, or document owner)."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = select(DocumentModel).where(
        DocumentModel.doc_id == doc_id,
        DocumentModel.tenant_id == tenant_uuid,
    )
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Update policy in DB
    new_policy = req.access_policy.model_dump()
    doc.access_policy = new_policy
    await session.commit()

    # Log audit event
    await AuditService.log_event(
        tenant_id=tenant_uuid,
        action="permission_update",
        user_id=user.sub,
        document_id=doc_id,
        session=session,
    )

    return DocumentResponse(
        doc_id=doc.doc_id,
        tenant_id=doc.tenant_id,
        owner_id=doc.owner_id,
        filename=doc.filename,
        title=doc.title,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        status=doc.status,
        access_policy=doc.access_policy,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.delete("/{doc_id}")
async def archive_document(
    doc_id: uuid.UUID,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    """Archive a document, excluding it from active retrieval."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = select(DocumentModel).where(
        DocumentModel.doc_id == doc_id,
        DocumentModel.tenant_id == tenant_uuid,
    )
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.status = "archived"
    await session.commit()

    # Log audit event
    await AuditService.log_event(
        tenant_id=tenant_uuid,
        action="archive",
        user_id=user.sub,
        document_id=doc_id,
        session=session,
    )

    return {"status": "archived", "doc_id": str(doc_id)}
