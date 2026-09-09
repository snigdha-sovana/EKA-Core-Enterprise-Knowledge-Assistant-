"""Celery tasks for ERP synchronization and background jobs."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from src.db.engine import get_engine, AsyncSessionLocal
from src.db.models.tenant import Tenant
from src.erp.mock_connector import MockERPConnector
from src.erp.service import ERPSyncService
from src.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_tenant_reconciliation(
    tenant_id_str: str,
    connector: Optional[MockERPConnector] = None,
    pipeline: Optional[Any] = None,
) -> Dict[str, Any]:
    """Execute asynchronous reconciliation for a given tenant."""
    get_engine()
    assert AsyncSessionLocal is not None

    tenant_uuid = uuid.UUID(tenant_id_str)
    async with AsyncSessionLocal() as session:
        summary = await ERPSyncService.reconcile_tenant(
            tenant_id=tenant_uuid,
            session=session,
            connector=connector,
            pipeline=pipeline,
        )
        return summary.to_dict()


async def _run_all_tenants_reconciliation(
    connector: Optional[MockERPConnector] = None,
    pipeline: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """Execute reconciliation across all active tenants."""
    get_engine()
    assert AsyncSessionLocal is not None

    async with AsyncSessionLocal() as session:
        stmt = select(Tenant.tenant_id).where(Tenant.is_active == True)  # noqa: E712
        res = await session.execute(stmt)
        tenant_ids = [str(t) for t in res.scalars().all()]

    summaries = []
    for tid in tenant_ids:
        try:
            summary = await _run_tenant_reconciliation(
                tid,
                connector=connector,
                pipeline=pipeline,
            )
            summaries.append(summary)
        except Exception as exc:
            logger.exception("Failed reconciliation for tenant %s: %s", tid, exc)
            summaries.append({"tenant_id": tid, "error": str(exc), "failed": 1})

    return summaries


@celery_app.task(name="tasks.reconcile_tenant", bind=True, max_retries=3, default_retry_delay=60)
def reconcile_tenant_task(self, tenant_id: str) -> Dict[str, Any]:
    """Celery task to reconcile ERP records for a specific tenant with auto-retry."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(_run_tenant_reconciliation(tenant_id))
        finally:
            loop.close()
    except Exception as exc:
        logger.error("Celery task reconcile_tenant failed for %s: %s", tenant_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.reconcile_all_tenants")
def reconcile_all_tenants_task() -> List[Dict[str, Any]]:
    """Celery Beat periodic task reconciling all active tenants every 14 days."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_run_all_tenants_reconciliation())
    finally:
        loop.close()


@celery_app.task(name="tasks.run_automated_backup")
def run_automated_backup_task(dest_dir: Optional[str] = None, retention_days: int = 7) -> Dict[str, Any]:
    """Celery Beat periodic task executing coordinated Postgres and Chroma disaster recovery backup."""
    from pathlib import Path
    from scripts.backup.backup_all import run_full_backup

    target_dir = Path(dest_dir) if dest_dir else Path("data/backups/bundles")
    logger.info("Starting automated disaster recovery backup to %s", target_dir)
    return run_full_backup(dest_dir=target_dir, retention_days=retention_days)

