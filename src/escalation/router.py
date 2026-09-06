"""Escalation cases CRUD router.

Routes under /tenants/{tenant_id}/escalations:
  GET    /                            → list cases (admin, filterable)
  GET    /{case_id}                   → get single case (admin)
  POST   /{case_id}/resolve           → resolve case (admin, requires doc)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_role
from src.auth.schemas import TokenPayload
from src.db.engine import get_async_session
from src.db.models.escalation_case import EscalationCase
from src.escalation.service import EscalationService

router = APIRouter(
    prefix="/tenants/{tenant_id}/escalations",
    tags=["Escalation Cases"],
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class EscalationCaseResponse(BaseModel):
    """Public representation of an escalation case."""

    case_id: uuid.UUID
    tenant_id: uuid.UUID
    department_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    query_hash: Optional[str] = None
    query_text: str
    status: str
    classification_reason: str
    confidence_score: Optional[float] = None
    resolution_doc_id: Optional[uuid.UUID] = None
    resolved_by: Optional[uuid.UUID] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResolveRequest(BaseModel):
    """Payload for resolving an escalation case."""

    resolution_doc_id: uuid.UUID = Field(
        ...,
        description=(
            "UUID of an active document already ingested into the knowledge base "
            "in response to this case. The document must belong to this tenant."
        ),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _resolve_tenant(tenant_id: uuid.UUID, user: TokenPayload) -> uuid.UUID:
    if not user.is_superadmin:
        try:
            caller_tenant = uuid.UUID(user.tenant_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid tenant context in token.")
        if caller_tenant != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to the requested tenant.",
            )
    return tenant_id


async def _get_case_or_404(
    case_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: AsyncSession,
) -> EscalationCase:
    stmt = select(EscalationCase).where(
        EscalationCase.case_id == case_id,
        EscalationCase.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Escalation case {case_id} not found in tenant {tenant_id}.",
        )
    return case


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=List[EscalationCaseResponse], summary="List escalation cases")
async def list_escalation_cases(
    tenant_id: uuid.UUID = Path(...),
    case_status: Optional[str] = Query(None, alias="status", description="Filter by status: open, resolved, classification_failed"),
    department_id: Optional[uuid.UUID] = Query(None, description="Filter by department"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> List[EscalationCaseResponse]:
    """List escalation cases for the tenant (admin only).

    Returns cases ordered newest-first. Filterable by status and department.
    """
    await _resolve_tenant(tenant_id, user)

    stmt = select(EscalationCase).where(EscalationCase.tenant_id == tenant_id)
    if case_status:
        stmt = stmt.where(EscalationCase.status == case_status)
    if department_id:
        stmt = stmt.where(EscalationCase.department_id == department_id)
    stmt = stmt.order_by(EscalationCase.created_at.desc()).offset(skip).limit(limit)

    result = await session.execute(stmt)
    return [EscalationCaseResponse.model_validate(c) for c in result.scalars().all()]


@router.get("/{case_id}", response_model=EscalationCaseResponse, summary="Get escalation case")
async def get_escalation_case(
    case_id: uuid.UUID = Path(...),
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> EscalationCaseResponse:
    """Fetch a single escalation case by ID."""
    await _resolve_tenant(tenant_id, user)
    case = await _get_case_or_404(case_id, tenant_id, session)
    return EscalationCaseResponse.model_validate(case)


@router.post(
    "/{case_id}/resolve",
    response_model=EscalationCaseResponse,
    summary="Resolve escalation case",
)
async def resolve_escalation_case(
    body: ResolveRequest,
    case_id: uuid.UUID = Path(...),
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> EscalationCaseResponse:
    """Resolve an open escalation case by linking a resolution document.

    The ``resolution_doc_id`` must point to an active document already ingested
    and indexed for this tenant. A case can only be resolved once.
    """
    await _resolve_tenant(tenant_id, user)
    case = await _get_case_or_404(case_id, tenant_id, session)

    if case.status == "resolved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case {case_id} is already resolved.",
        )

    try:
        resolver_uuid = uuid.UUID(user.sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid user ID in token.")

    resolved = await EscalationService.resolve_case(
        session=session,
        case=case,
        resolution_doc_id=body.resolution_doc_id,
        resolved_by=resolver_uuid,
    )
    return EscalationCaseResponse.model_validate(resolved)
