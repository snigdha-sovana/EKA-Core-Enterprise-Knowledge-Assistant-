"""Add erp_sync_records table.

Revision ID: 0005_erp_sync
Revises: 0004_escalation_cases
Create Date: 2026-09-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0005_erp_sync'
down_revision: Union[str, None] = '0004_escalation_cases'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'erp_sync_records',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            'tenant_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('tenants.tenant_id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'source_system',
            sa.String(64),
            nullable=False,
            server_default='mock_erp',
        ),
        sa.Column(
            'external_record_id',
            sa.String(128),
            nullable=False,
        ),
        sa.Column(
            'entity_type',
            sa.String(64),
            nullable=False,
            server_default='document',
        ),
        sa.Column(
            'title',
            sa.String(255),
            nullable=False,
            server_default='',
        ),
        sa.Column(
            'version_hash',
            sa.String(64),
            nullable=False,
            server_default='',
        ),
        sa.Column(
            'document_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('documents.doc_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'department_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('departments.department_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'last_synced_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            'sync_status',
            sa.String(32),
            nullable=False,
            server_default='synced',
        ),
        sa.Column(
            'is_deleted',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
        sa.Column(
            'sync_error',
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            'raw_metadata',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.UniqueConstraint(
            'tenant_id',
            'source_system',
            'external_record_id',
            name='uq_erp_sync_tenant_source_record',
        ),
    )
    op.create_index(
        'ix_erp_sync_records_tenant_id',
        'erp_sync_records',
        ['tenant_id'],
    )
    op.create_index(
        'ix_erp_sync_records_source_system',
        'erp_sync_records',
        ['source_system'],
    )
    op.create_index(
        'ix_erp_sync_records_external_record_id',
        'erp_sync_records',
        ['external_record_id'],
    )
    op.create_index(
        'ix_erp_sync_records_sync_status',
        'erp_sync_records',
        ['sync_status'],
    )
    op.create_index(
        'ix_erp_sync_records_is_deleted',
        'erp_sync_records',
        ['is_deleted'],
    )


def downgrade() -> None:
    op.drop_index('ix_erp_sync_records_is_deleted', table_name='erp_sync_records')
    op.drop_index('ix_erp_sync_records_sync_status', table_name='erp_sync_records')
    op.drop_index('ix_erp_sync_records_external_record_id', table_name='erp_sync_records')
    op.drop_index('ix_erp_sync_records_source_system', table_name='erp_sync_records')
    op.drop_index('ix_erp_sync_records_tenant_id', table_name='erp_sync_records')
    op.drop_table('erp_sync_records')
