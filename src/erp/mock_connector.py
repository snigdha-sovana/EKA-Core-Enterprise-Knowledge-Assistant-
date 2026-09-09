"""Mock ERP Connector for simulated ERP systems (SAP, NetSuite, Odoo)."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class ERPRecord:
    """Represents an external entity inside the ERP system."""

    external_record_id: str
    title: str
    content: str
    department_name: str
    entity_type: str = "policy"
    version: str = "1.0"
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def version_hash(self) -> str:
        """Compute deterministic SHA-256 hash of record content and status."""
        payload = f"{self.title}:{self.content}:{self.is_deleted}:{self.department_name}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "external_record_id": self.external_record_id,
            "title": self.title,
            "content": self.content,
            "department_name": self.department_name,
            "entity_type": self.entity_type,
            "version": self.version,
            "updated_at": self.updated_at.isoformat(),
            "is_deleted": self.is_deleted,
            "version_hash": self.version_hash,
            "metadata": self.metadata,
        }


def _get_default_seed_records() -> List[ERPRecord]:
    now = datetime.now(timezone.utc)
    return [
        ERPRecord(
            external_record_id="HR-POL-101",
            title="Enterprise Remote Work & Hybrid Work Schedule Policy",
            content=(
                "All full-time employees are eligible for hybrid work after completing their 90-day onboarding period. "
                "Employees may work remotely up to 3 days per week with core in-office days on Tuesdays and Thursdays. "
                "Core business hours across all regions are 10:00 AM to 4:00 PM local time. "
                "Equipment stipends up to $1,000 are reimbursable once every 24 months for ergonomic workspace setups."
            ),
            department_name="Human Resources",
            entity_type="hr_policy",
            version="1.0",
            updated_at=now,
            metadata={"cost_center": "CC-HR-001", "effective_year": 2026},
        ),
        ERPRecord(
            external_record_id="FIN-EXP-202",
            title="Corporate Expense Reimbursement & Travel Policy",
            content=(
                "Business travel expenses must be submitted through the ERP portal within 30 days of the travel date. "
                "Daily meal allowances (per diem) are capped at $85 for domestic travel and $125 for international travel. "
                "Hotel stays require standard single-room bookings not exceeding $250/night before tax. "
                "Expenses over $500 require prior written approval from the department VP or Finance Director."
            ),
            department_name="Finance",
            entity_type="finance_procedure",
            version="1.0",
            updated_at=now,
            metadata={"cost_center": "CC-FIN-002", "currency": "USD"},
        ),
        ERPRecord(
            external_record_id="ENG-SEC-303",
            title="Production Infrastructure Security & Incident Response Runbook",
            content=(
                "All access to production Kubernetes clusters and PostgreSQL databases requires SSO with hardware MFA. "
                "Critical vulnerability remediation SLA is 24 hours from disclosure. "
                "Production database migrations must run during the weekly maintenance window on Saturdays at 02:00 UTC. "
                "In the event of a security breach, notify the Incident Commander at security@enterprise.local immediately."
            ),
            department_name="Engineering",
            entity_type="engineering_spec",
            version="1.0",
            updated_at=now,
            metadata={"confidentiality": "internal", "compliance": ["SOC2", "ISO27001"]},
        ),
    ]


class MockERPConnector:
    """Least-privilege, read-only connector to simulate ERP integration.

    Acts as an ERP API client (e.g. for SAP BAPI/OData, NetSuite SuiteTalk, or Odoo XML-RPC).
    """

    def __init__(self, seed_records: Optional[List[ERPRecord]] = None):
        records = seed_records if seed_records is not None else _get_default_seed_records()
        self._records: Dict[str, ERPRecord] = {r.external_record_id: r for r in records}

    def fetch_records(
        self,
        tenant_id: str,
        since: Optional[datetime] = None,
        entity_type: Optional[str] = None,
    ) -> List[ERPRecord]:
        """Fetch records from the mock ERP system, optionally filtered by timestamp or entity type."""
        results = []
        for r in self._records.values():
            if since and r.updated_at < since:
                continue
            if entity_type and r.entity_type != entity_type:
                continue
            results.append(r)
        return results

    def fetch_record(self, tenant_id: str, external_record_id: str) -> Optional[ERPRecord]:
        """Fetch a single record by external ID."""
        return self._records.get(external_record_id)

    def add_or_update_record(self, record: ERPRecord) -> None:
        """Mutate connector state to simulate ERP data changes."""
        record.updated_at = datetime.now(timezone.utc)
        self._records[record.external_record_id] = record

    def delete_record(self, external_record_id: str) -> bool:
        """Simulate soft deletion of an ERP record."""
        if external_record_id in self._records:
            self._records[external_record_id].is_deleted = True
            self._records[external_record_id].updated_at = datetime.now(timezone.utc)
            return True
        return False

    @staticmethod
    def compute_signature(payload_bytes: bytes, secret: str) -> str:
        """Compute HMAC-SHA256 signature for webhook validation."""
        return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

    @staticmethod
    def verify_signature(payload_bytes: bytes, secret: str, signature: str) -> bool:
        """Securely verify HMAC-SHA256 signature."""
        expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def create_webhook_payload(
        self,
        event: str,
        record: ERPRecord,
        tenant_id: str,
    ) -> Dict[str, Any]:
        """Create a standard simulated ERP webhook payload."""
        return {
            "event": event,  # e.g. "record.created", "record.updated", "record.deleted"
            "tenant_id": str(tenant_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "record": record.to_dict(),
        }
