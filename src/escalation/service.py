"""Escalation service: centralized abstention handling and case lifecycle management.

This module is the single place that creates escalation cases. Both the
``/query`` and ``/query/stream`` endpoints call ``EscalationService.handle_abstention``
so the behavior is identical and cases are never duplicated.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.department import Department
from src.db.models.escalation_case import EscalationCase

logger = logging.getLogger(__name__)

# Status constants
STATUS_OPEN = "open"
STATUS_RESOLVED = "resolved"
STATUS_CLASSIFICATION_FAILED = "classification_failed"


def _hash_query(query_text: str) -> str:
    """Return SHA-256 hex digest of the query text (privacy-preserving)."""
    return hashlib.sha256(query_text.encode("utf-8")).hexdigest()


async def _find_departments(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> list[Department]:
    """Return all active departments for the tenant, fallback department last."""
    stmt = (
        select(Department)
        .where(
            Department.tenant_id == tenant_id,
            Department.is_active.is_(True),
        )
        .order_by(Department.is_fallback.asc(), Department.created_at.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _classify_query_to_department(
    query_text: str,
    departments: list[Department],
    generator: Any,
) -> tuple[Department | None, str]:
    """Use the LLM to classify the query to the most relevant department.

    Returns (department, reason_text). Returns (None, reason) on failure.
    """
    if not departments:
        return None, "No departments configured for this tenant."

    dept_list = "\n".join(
        f"- {d.name}: {d.description or 'No description'}" for d in departments if not d.is_fallback
    )
    fallback_depts = [d for d in departments if d.is_fallback]

    if not dept_list.strip():
        # Only fallback dept exists — route there directly
        if fallback_depts:
            return fallback_depts[0], "Only fallback department available."
        return None, "No departments configured for this tenant."

    prompt = (
        "You are a routing assistant. Given an employee's question and a list of "
        "company departments, identify which single department is best suited to "
        "answer this question. Reply ONLY with the exact department name from the "
        "list, nothing else.\n\n"
        f"Question: {query_text}\n\n"
        f"Departments:\n{dept_list}\n\n"
        "Department name:"
    )

    try:
        # Use a minimal context — we only need the classification label
        result = await generator.generate_async(prompt, contexts=[])
        classified_name = result.strip().strip('"').strip("'")

        # Find matching department (case-insensitive)
        for dept in departments:
            if dept.name.lower() == classified_name.lower():
                return dept, f"LLM classified query to '{dept.name}'."

        logger.warning(
            "LLM returned unknown department name '%s'; using fallback.", classified_name
        )
        if fallback_depts:
            return (
                fallback_depts[0],
                f"LLM returned unknown department '{classified_name}'; routed to fallback.",
            )
        return None, f"LLM returned unknown department '{classified_name}'."

    except Exception as exc:
        logger.warning("LLM classification failed: %s", exc)
        if fallback_depts:
            return fallback_depts[0], f"Classification failed ({exc}); routed to fallback."
        return None, f"Classification failed: {exc}"


class EscalationService:
    """Centralised escalation case management."""

    @staticmethod
    async def handle_abstention(
        session: AsyncSession,
        tenant_id: str,
        user_id: str | None,
        query_text: str,
        confidence_score: float,
        generator: Any = None,
    ) -> dict[str, Any]:
        """Create an escalation case for an unanswerable query.

        Workflow:
          1. Load tenant departments (non-fallback first, fallback last).
          2. Ask the LLM to classify query → best department.
          3. On classification failure → use fallback department, mark
             status=``classification_failed``.
          4. Persist the EscalationCase and return a forwarding payload.

        Args:
            session: Active async DB session.
            tenant_id: Tenant UUID string.
            user_id: UUID string of the querying user (may be None).
            query_text: The original query (stored for department owner context).
            confidence_score: Retrieval confidence that triggered abstention.
            generator: LLM Generator instance for department classification.

        Returns:
            dict with keys: status, case_id, department_id, department_name,
            classification_reason.
        """
        try:
            tenant_uuid = uuid.UUID(tenant_id)
        except (ValueError, TypeError):
            logger.error("Invalid tenant_id for escalation: %s", tenant_id)
            return {"status": "error", "detail": "Invalid tenant ID."}

        user_uuid: uuid.UUID | None = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
            except (ValueError, TypeError):
                pass

        # 1. Load departments
        departments = await _find_departments(session, tenant_uuid)

        # 2. Classify
        chosen_dept: Department | None = None
        reason = ""
        final_status = STATUS_OPEN

        if generator is not None and departments:
            chosen_dept, reason = await _classify_query_to_department(
                query_text, departments, generator
            )
        elif departments:
            # No generator available — use fallback directly
            fallbacks = [d for d in departments if d.is_fallback]
            if fallbacks:
                chosen_dept = fallbacks[0]
                reason = "No LLM generator available; routed to fallback department."
            else:
                chosen_dept = departments[0]
                reason = "No LLM generator available; routed to first available department."

        if chosen_dept is None:
            final_status = STATUS_CLASSIFICATION_FAILED
            reason = reason or "No departments found for this tenant."

        # 3. Persist the case
        case = EscalationCase(
            case_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            department_id=chosen_dept.department_id if chosen_dept else None,
            user_id=user_uuid,
            query_text=query_text,
            query_hash=_hash_query(query_text),
            status=final_status,
            classification_reason=reason,
            confidence_score=confidence_score,
        )
        session.add(case)
        try:
            await session.commit()
            await session.refresh(case)
        except Exception as exc:
            logger.error("Failed to persist escalation case: %s", exc)
            await session.rollback()
            return {
                "status": "error",
                "detail": "Could not create escalation case.",
            }

        logger.info(
            "Created escalation case %s for tenant %s → dept %s (status=%s)",
            case.case_id,
            tenant_id,
            chosen_dept.name if chosen_dept else "none",
            final_status,
        )

        return {
            "status": "forwarded",
            "case_id": str(case.case_id),
            "department_id": str(chosen_dept.department_id) if chosen_dept else None,
            "department_name": chosen_dept.name if chosen_dept else None,
            "classification_reason": reason,
            "escalation_status": final_status,
        }

    @staticmethod
    async def resolve_case(
        session: AsyncSession,
        case: EscalationCase,
        resolution_doc_id: uuid.UUID,
        resolved_by: uuid.UUID,
    ) -> EscalationCase:
        """Transition a case to 'resolved', linking the source document.

        Args:
            session: Active async DB session.
            case: The EscalationCase ORM object to resolve.
            resolution_doc_id: UUID of the document uploaded in response to this case.
            resolved_by: UUID of the admin/owner resolving the case.

        Returns:
            The updated EscalationCase.
        """
        from src.db.models.document import DocumentModel

        # Verify the document exists and belongs to the same tenant
        doc_stmt = select(DocumentModel).where(
            DocumentModel.doc_id == resolution_doc_id,
            DocumentModel.tenant_id == case.tenant_id,
            DocumentModel.status == "active",
        )
        doc_result = await session.execute(doc_stmt)
        doc = doc_result.scalar_one_or_none()
        if doc is None:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=422,
                detail=(
                    f"Document {resolution_doc_id} not found in tenant "
                    f"{case.tenant_id} or is not active."
                ),
            )

        case.status = STATUS_RESOLVED
        case.resolution_doc_id = resolution_doc_id
        case.resolved_by = resolved_by
        case.resolved_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(case)
        return case
