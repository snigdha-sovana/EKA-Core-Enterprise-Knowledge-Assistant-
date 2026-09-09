"""ERP Synchronization Service for reconciling vector store with ERP records."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.audit.service import AuditService
from src.db.models.department import Department
from src.db.models.document import DocumentModel
from src.db.models.erp_sync import ERPSyncRecord
from src.erp.mock_connector import ERPRecord, MockERPConnector

logger = logging.getLogger(__name__)


@dataclass
class SyncSummary:
    """Summary metrics of an ERP reconciliation run."""

    tenant_id: str
    added: int = 0
    updated: int = 0
    deleted: int = 0
    unchanged: int = 0
    failed: int = 0
    errors: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tenant_id": self.tenant_id,
            "added": self.added,
            "updated": self.updated,
            "deleted": self.deleted,
            "unchanged": self.unchanged,
            "failed": self.failed,
            "errors": self.errors,
            "timestamp": self.timestamp.isoformat(),
        }


class ERPSyncService:
    """Orchestrates ERP record synchronization, change detection, and vector indexing."""

    DEFAULT_CONNECTOR = MockERPConnector()

    @classmethod
    async def reconcile_tenant(
        cls,
        tenant_id: uuid.UUID,
        session: AsyncSession,
        connector: Optional[MockERPConnector] = None,
        pipeline: Optional[Any] = None,
    ) -> SyncSummary:
        """Reconcile all external ERP records for a tenant against local database and vector store."""
        summary = SyncSummary(tenant_id=str(tenant_id))
        active_connector = connector or cls.DEFAULT_CONNECTOR

        # Lazy-import pipeline if not provided
        rag_pipeline = pipeline
        if rag_pipeline is None:
            from src.api.app import get_pipeline
            rag_pipeline = get_pipeline()

        # 1. Fetch tenant departments to resolve department mappings
        dept_stmt = select(Department).where(
            Department.tenant_id == tenant_id,
            Department.is_active == True,  # noqa: E712
        )
        dept_res = await session.execute(dept_stmt)
        departments = dept_res.scalars().all()

        dept_map: Dict[str, uuid.UUID] = {}
        fallback_dept_id: Optional[uuid.UUID] = None
        for d in departments:
            dept_map[d.name.lower().strip()] = d.department_id
            if d.is_fallback:
                fallback_dept_id = d.department_id

        # 2. Fetch external ERP records
        try:
            records = active_connector.fetch_records(tenant_id=str(tenant_id))
        except Exception as exc:
            logger.exception("Failed to fetch records from ERP connector for tenant %s", tenant_id)
            summary.failed += 1
            summary.errors.append(f"Connector fetch failed: {exc}")
            return summary

        # 3. Load all existing ERPSyncRecords for this tenant
        sync_stmt = select(ERPSyncRecord).where(
            ERPSyncRecord.tenant_id == tenant_id,
            ERPSyncRecord.source_system == "mock_erp",
        )
        sync_res = await session.execute(sync_stmt)
        existing_map: Dict[str, ERPSyncRecord] = {
            r.external_record_id: r for r in sync_res.scalars().all()
        }

        now = datetime.now(timezone.utc)

        # 4. Process each ERP record
        for record in records:
            ext_id = record.external_record_id
            existing = existing_map.get(ext_id)

            # Match department
            matched_dept_id = dept_map.get(record.department_name.lower().strip(), fallback_dept_id)

            try:
                if record.is_deleted:
                    # Deletion handling
                    if existing and not existing.is_deleted:
                        if existing.document_id:
                            # Archive DocumentModel
                            doc_stmt = select(DocumentModel).where(
                                DocumentModel.doc_id == existing.document_id,
                                DocumentModel.tenant_id == tenant_id,
                            )
                            doc_res = await session.execute(doc_stmt)
                            doc = doc_res.scalar_one_or_none()
                            if doc:
                                doc.status = "archived"

                            # Purge vector store chunks
                            if rag_pipeline:
                                rag_pipeline.delete_document(
                                    doc_id=str(existing.document_id),
                                    tenant_id=str(tenant_id),
                                )

                        existing.is_deleted = True
                        existing.sync_status = "deleted"
                        existing.last_synced_at = now
                        summary.deleted += 1
                    else:
                        summary.unchanged += 1

                elif existing is None:
                    # Brand new record -> Ingest
                    new_doc_id = uuid.uuid4()
                    chunk_count = 0
                    if rag_pipeline:
                        chunk_count = rag_pipeline.ingest_text(
                            content=record.content,
                            filename=f"erp_{record.external_record_id.lower()}.txt",
                            title=record.title,
                            tenant_id=str(tenant_id),
                            doc_id=str(new_doc_id),
                            department_id=str(matched_dept_id) if matched_dept_id else None,
                            source_system="mock_erp",
                            access_policy={"is_public": True},
                        )

                    # Create DocumentModel
                    doc_record = DocumentModel(
                        doc_id=new_doc_id,
                        tenant_id=tenant_id,
                        owner_id=None,
                        filename=f"erp_{record.external_record_id.lower()}.txt",
                        title=record.title,
                        mime_type="text/plain",
                        file_size_bytes=len(record.content.encode("utf-8")),
                        chunk_count=chunk_count,
                        status="active",
                        access_policy={
                            "is_public": True,
                            "department_id": str(matched_dept_id) if matched_dept_id else None,
                            "source_system": "mock_erp",
                            "external_record_id": record.external_record_id,
                        },
                    )
                    session.add(doc_record)

                    # Create ERPSyncRecord
                    sync_rec = ERPSyncRecord(
                        tenant_id=tenant_id,
                        source_system="mock_erp",
                        external_record_id=record.external_record_id,
                        entity_type=record.entity_type,
                        title=record.title,
                        version_hash=record.version_hash,
                        document_id=new_doc_id,
                        department_id=matched_dept_id,
                        last_synced_at=now,
                        sync_status="synced",
                        is_deleted=False,
                        raw_metadata=record.metadata,
                    )
                    session.add(sync_rec)
                    summary.added += 1

                else:
                    # Existing record -> Check for modifications (idempotency check)
                    if existing.version_hash == record.version_hash and not existing.is_deleted:
                        summary.unchanged += 1
                    else:
                        # Modified or re-activated -> Re-index
                        doc_id = existing.document_id or uuid.uuid4()
                        if existing.document_id and rag_pipeline:
                            rag_pipeline.delete_document(
                                doc_id=str(existing.document_id),
                                tenant_id=str(tenant_id),
                            )

                        chunk_count = 0
                        if rag_pipeline:
                            chunk_count = rag_pipeline.ingest_text(
                                content=record.content,
                                filename=f"erp_{record.external_record_id.lower()}.txt",
                                title=record.title,
                                tenant_id=str(tenant_id),
                                doc_id=str(doc_id),
                                department_id=str(matched_dept_id) if matched_dept_id else None,
                                source_system="mock_erp",
                                access_policy={"is_public": True},
                            )

                        # Update or create DocumentModel
                        doc_stmt = select(DocumentModel).where(
                            DocumentModel.doc_id == doc_id,
                            DocumentModel.tenant_id == tenant_id,
                        )
                        doc_res = await session.execute(doc_stmt)
                        doc = doc_res.scalar_one_or_none()
                        if doc:
                            doc.title = record.title
                            doc.file_size_bytes = len(record.content.encode("utf-8"))
                            doc.chunk_count = chunk_count
                            doc.status = "active"
                            doc.access_policy = {
                                "is_public": True,
                                "department_id": str(matched_dept_id) if matched_dept_id else None,
                                "source_system": "mock_erp",
                                "external_record_id": record.external_record_id,
                            }
                        else:
                            doc = DocumentModel(
                                doc_id=doc_id,
                                tenant_id=tenant_id,
                                filename=f"erp_{record.external_record_id.lower()}.txt",
                                title=record.title,
                                mime_type="text/plain",
                                file_size_bytes=len(record.content.encode("utf-8")),
                                chunk_count=chunk_count,
                                status="active",
                                access_policy={
                                    "is_public": True,
                                    "department_id": str(matched_dept_id) if matched_dept_id else None,
                                    "source_system": "mock_erp",
                                    "external_record_id": record.external_record_id,
                                },
                            )
                            session.add(doc)

                        existing.title = record.title
                        existing.version_hash = record.version_hash
                        existing.department_id = matched_dept_id
                        existing.document_id = doc_id
                        existing.last_synced_at = now
                        existing.sync_status = "synced"
                        existing.is_deleted = False
                        existing.raw_metadata = record.metadata
                        summary.updated += 1

            except Exception as exc:
                logger.exception("Error syncing ERP record %s for tenant %s: %s", ext_id, tenant_id, exc)
                summary.failed += 1
                summary.errors.append(f"{ext_id}: {exc}")
                if existing:
                    existing.sync_status = "failed"
                    existing.sync_error = str(exc)

        await session.commit()

        # Audit log event
        try:
            await AuditService.log_event(
                session=session,
                tenant_id=tenant_id,
                action="erp_sync_reconcile",
                user_id=None,
            )
        except Exception as audit_exc:
            logger.warning("Failed to record ERP sync audit log: %s", audit_exc)

        return summary

    @classmethod
    async def handle_webhook(
        cls,
        tenant_id: uuid.UUID,
        payload_bytes: bytes,
        signature: str,
        secret: str,
        session: AsyncSession,
        pipeline: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Verify webhook signature and apply single-record incremental update or deletion."""
        import json

        if not MockERPConnector.verify_signature(payload_bytes, secret, signature):
            raise ValueError("Invalid webhook signature.")

        payload = json.loads(payload_bytes.decode("utf-8"))
        event = payload.get("event", "record.updated")
        record_data = payload.get("record", {})

        record = ERPRecord(
            external_record_id=record_data["external_record_id"],
            title=record_data.get("title", ""),
            content=record_data.get("content", ""),
            department_name=record_data.get("department_name", ""),
            entity_type=record_data.get("entity_type", "document"),
            version=record_data.get("version", "1.0"),
            is_deleted=record_data.get("is_deleted", False) or event == "record.deleted",
            metadata=record_data.get("metadata", {}),
        )

        connector = MockERPConnector(seed_records=[record])
        summary = await cls.reconcile_tenant(
            tenant_id=tenant_id,
            session=session,
            connector=connector,
            pipeline=pipeline,
        )

        # Record audit log
        try:
            await AuditService.log_event(
                session=session,
                tenant_id=tenant_id,
                action="erp_webhook_sync",
                user_id=None,
            )
        except Exception as audit_exc:
            logger.warning("Failed to record webhook audit log: %s", audit_exc)

        return {
            "status": "processed",
            "event": event,
            "external_record_id": record.external_record_id,
            "summary": summary.to_dict(),
        }

    @classmethod
    async def get_sync_status(
        cls,
        tenant_id: uuid.UUID,
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """Aggregate health metrics, counts, and last-synced timestamp for tenant ERP data."""
        stmt = select(
            func.count(ERPSyncRecord.id).label("total"),
            func.count(ERPSyncRecord.id).filter(
                ERPSyncRecord.sync_status == "synced",
                ERPSyncRecord.is_deleted == False,  # noqa: E712
            ).label("active_synced"),
            func.count(ERPSyncRecord.id).filter(
                ERPSyncRecord.is_deleted == True,  # noqa: E712
            ).label("deleted"),
            func.count(ERPSyncRecord.id).filter(
                ERPSyncRecord.sync_status == "failed",
            ).label("failed"),
            func.max(ERPSyncRecord.last_synced_at).label("last_synced_at"),
        ).where(ERPSyncRecord.tenant_id == tenant_id)

        result = await session.execute(stmt)
        row = result.first()

        # Department breakdown
        dept_stmt = (
            select(
                Department.name,
                func.count(ERPSyncRecord.id),
            )
            .join(ERPSyncRecord, ERPSyncRecord.department_id == Department.department_id)
            .where(
                ERPSyncRecord.tenant_id == tenant_id,
                ERPSyncRecord.is_deleted == False,  # noqa: E712
            )
            .group_by(Department.name)
        )
        dept_res = await session.execute(dept_stmt)
        dept_counts = {name: count for name, count in dept_res.all()}

        return {
            "tenant_id": str(tenant_id),
            "source_system": "mock_erp",
            "total_tracked": row.total if row else 0,
            "active_synced": row.active_synced if row else 0,
            "deleted": row.deleted if row else 0,
            "failed": row.failed if row else 0,
            "last_synced_at": row.last_synced_at.isoformat() if (row and row.last_synced_at) else None,
            "department_counts": dept_counts,
        }
