"""FastAPI router for ERP Connector, Webhooks, Synchronization, and Admin Dashboard."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_role
from src.auth.schemas import TokenPayload
from src.config import settings
from src.db.engine import get_async_session
from src.db.models.audit_log import AuditLog
from src.db.models.department import Department
from src.db.models.document import DocumentModel
from src.db.models.erp_sync import ERPSyncRecord
from src.db.models.escalation_case import EscalationCase
from src.erp.service import ERPSyncService, SyncSummary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ERP & Dashboard"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ERPRecordResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    source_system: str
    external_record_id: str
    entity_type: str
    title: str
    version_hash: str
    document_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    sync_status: str
    is_deleted: bool
    last_synced_at: Optional[str] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class ERPSyncStatusResponse(BaseModel):
    tenant_id: str
    source_system: str
    total_tracked: int
    active_synced: int
    deleted: int
    failed: int
    last_synced_at: Optional[str] = None
    department_counts: Dict[str, int]


class DashboardOverviewResponse(BaseModel):
    tenant_id: str
    knowledge_base: Dict[str, Any]
    escalation_queue: Dict[str, Any]
    audit_history: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Tenant Validation Helper
# ---------------------------------------------------------------------------


def _validate_tenant_access(user: TokenPayload, tenant_id: uuid.UUID) -> None:
    if user.is_superadmin:
        return
    try:
        user_tenant = uuid.UUID(user.tenant_id)
        if user_tenant != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to resources belonging to another tenant is denied.",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID in credentials.",
        )


# ---------------------------------------------------------------------------
# ERP Sync Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/tenants/{tenant_id}/erp/sync",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def trigger_erp_sync(
    tenant_id: uuid.UUID,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, Any]:
    """Trigger on-demand ERP reconciliation for a tenant (curator/admin only)."""
    _validate_tenant_access(user, tenant_id)
    summary = await ERPSyncService.reconcile_tenant(
        tenant_id=tenant_id,
        session=session,
    )
    return {
        "status": "completed",
        "summary": summary.to_dict(),
    }


@router.get(
    "/tenants/{tenant_id}/erp/sync-status",
    response_model=ERPSyncStatusResponse,
)
async def get_erp_sync_status(
    tenant_id: uuid.UUID,
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> ERPSyncStatusResponse:
    """Retrieve ERP synchronization health metrics and counts."""
    _validate_tenant_access(user, tenant_id)
    data = await ERPSyncService.get_sync_status(tenant_id=tenant_id, session=session)
    return ERPSyncStatusResponse(**data)


@router.get(
    "/tenants/{tenant_id}/erp/records",
    response_model=List[ERPRecordResponse],
)
async def list_erp_records(
    tenant_id: uuid.UUID,
    entity_type: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    sync_status_filter: Optional[str] = Query(None, alias="status"),
    is_deleted: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> List[ERPRecordResponse]:
    """List tracked ERP records with optional filtering."""
    _validate_tenant_access(user, tenant_id)

    stmt = select(ERPSyncRecord).where(ERPSyncRecord.tenant_id == tenant_id)
    if entity_type:
        stmt = stmt.where(ERPSyncRecord.entity_type == entity_type)
    if department_id:
        stmt = stmt.where(ERPSyncRecord.department_id == department_id)
    if sync_status_filter:
        stmt = stmt.where(ERPSyncRecord.sync_status == sync_status_filter)
    if is_deleted is not None:
        stmt = stmt.where(ERPSyncRecord.is_deleted == is_deleted)

    result = await session.execute(
        stmt.order_by(desc(ERPSyncRecord.last_synced_at)).offset(skip).limit(limit)
    )
    records = result.scalars().all()

    return [
        ERPRecordResponse(
            id=r.id,
            tenant_id=r.tenant_id,
            source_system=r.source_system,
            external_record_id=r.external_record_id,
            entity_type=r.entity_type,
            title=r.title,
            version_hash=r.version_hash,
            document_id=r.document_id,
            department_id=r.department_id,
            sync_status=r.sync_status,
            is_deleted=r.is_deleted,
            last_synced_at=r.last_synced_at.isoformat() if r.last_synced_at else None,
            raw_metadata=r.raw_metadata or {},
        )
        for r in records
    ]


# ---------------------------------------------------------------------------
# Webhook Endpoint
# ---------------------------------------------------------------------------


@router.post("/erp/webhook", status_code=status.HTTP_200_OK)
async def receive_erp_webhook(
    request: Request,
    x_erp_signature: Optional[str] = Header(None, alias="X-ERP-Signature"),
    x_erp_tenant_id: Optional[str] = Header(None, alias="X-ERP-Tenant-ID"),
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, Any]:
    """Receive simulated or real ERP webhooks with HMAC-SHA256 signature verification."""
    if not x_erp_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-ERP-Signature header.",
        )
    if not x_erp_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-ERP-Tenant-ID header.",
        )

    try:
        tenant_uuid = uuid.UUID(x_erp_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-ERP-Tenant-ID header.",
        )

    payload_bytes = await request.body()
    webhook_secret = settings.jwt_secret_key

    try:
        result = await ERPSyncService.handle_webhook(
            tenant_id=tenant_uuid,
            payload_bytes=payload_bytes,
            signature=x_erp_signature,
            secret=webhook_secret,
            session=session,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Error processing ERP webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing error: {exc}",
        )


# ---------------------------------------------------------------------------
# Unified Admin Dashboard Endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/tenants/{tenant_id}/dashboard",
    response_model=DashboardOverviewResponse,
)
async def get_tenant_dashboard(
    tenant_id: uuid.UUID,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DashboardOverviewResponse:
    """Unified operational dashboard for enterprise administrators.

    Aggregates:
    - Knowledge Base & ERP Sync state
    - Department escalation queue counts
    - Recent audit log activity
    """
    _validate_tenant_access(user, tenant_id)

    # 1. Knowledge Base Stats
    doc_count_stmt = select(
        func.count(DocumentModel.doc_id).filter(DocumentModel.status == "active").label("active_docs"),
        func.count(DocumentModel.doc_id).filter(DocumentModel.status == "archived").label("archived_docs"),
    ).where(DocumentModel.tenant_id == tenant_id)
    doc_res = await session.execute(doc_count_stmt)
    doc_row = doc_res.first()

    erp_status = await ERPSyncService.get_sync_status(tenant_id=tenant_id, session=session)

    knowledge_base = {
        "active_documents": doc_row.active_docs if doc_row else 0,
        "archived_documents": doc_row.archived_docs if doc_row else 0,
        "erp_synced_records": erp_status.get("active_synced", 0),
        "last_erp_sync": erp_status.get("last_synced_at"),
        "department_distribution": erp_status.get("department_counts", {}),
    }

    # 2. Escalation Queue Stats
    esc_stmt = select(
        func.count(EscalationCase.case_id).filter(EscalationCase.status == "open").label("open_cases"),
        func.count(EscalationCase.case_id).filter(EscalationCase.status == "resolved").label("resolved_cases"),
    ).where(EscalationCase.tenant_id == tenant_id)
    esc_res = await session.execute(esc_stmt)
    esc_row = esc_res.first()

    fallback_stmt = select(Department.name).where(
        Department.tenant_id == tenant_id,
        Department.is_fallback == True,  # noqa: E712
    )
    fallback_res = await session.execute(fallback_stmt)
    fallback_name = fallback_res.scalar_one_or_none() or "None"

    escalation_queue = {
        "open_cases": esc_row.open_cases if esc_row else 0,
        "resolved_cases": esc_row.resolved_cases if esc_row else 0,
        "fallback_department": fallback_name,
    }

    # 3. Recent Audit History
    audit_stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id)
        .order_by(desc(AuditLog.created_at))
        .limit(10)
    )
    audit_res = await session.execute(audit_stmt)
    audit_logs = audit_res.scalars().all()

    audit_history = [
        {
            "id": str(log.event_id),
            "action": log.action,
            "timestamp": log.created_at.isoformat(),
            "user_id": str(log.user_id) if log.user_id else None,
            "document_id": str(log.document_id) if log.document_id else None,
        }
        for log in audit_logs
    ]

    return DashboardOverviewResponse(
        tenant_id=str(tenant_id),
        knowledge_base=knowledge_base,
        escalation_queue=escalation_queue,
        audit_history=audit_history,
    )
