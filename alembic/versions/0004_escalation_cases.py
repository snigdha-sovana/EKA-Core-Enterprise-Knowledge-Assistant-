"""Add escalation_cases table.

Revision ID: 0004_escalation_cases
Revises: 0003_departments
Create Date: 2026-09-06 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0004_escalation_cases'
down_revision: Union[str, None] = '0003_departments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'escalation_cases',
        sa.Column(
            'case_id',
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
            'department_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('departments.department_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.user_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'query_text',
            sa.Text(),
            server_default='',
            nullable=False,
        ),
        sa.Column(
            'query_hash',
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            'status',
            sa.String(length=32),
            server_default='open',
            nullable=False,
        ),
        sa.Column(
            'classification_reason',
            sa.Text(),
            server_default='',
            nullable=False,
        ),
        sa.Column(
            'confidence_score',
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            'resolution_doc_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('documents.doc_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'resolved_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.user_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'resolved_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index('ix_escalation_cases_tenant_id', 'escalation_cases', ['tenant_id'])
    op.create_index('ix_escalation_cases_department_id', 'escalation_cases', ['department_id'])
    op.create_index('ix_escalation_cases_user_id', 'escalation_cases', ['user_id'])
    op.create_index('ix_escalation_cases_status', 'escalation_cases', ['status'])
    op.create_index('ix_escalation_cases_query_hash', 'escalation_cases', ['query_hash'])
    op.create_index('ix_escalation_cases_created_at', 'escalation_cases', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_escalation_cases_created_at', table_name='escalation_cases')
    op.drop_index('ix_escalation_cases_query_hash', table_name='escalation_cases')
    op.drop_index('ix_escalation_cases_status', table_name='escalation_cases')
    op.drop_index('ix_escalation_cases_user_id', table_name='escalation_cases')
    op.drop_index('ix_escalation_cases_department_id', table_name='escalation_cases')
    op.drop_index('ix_escalation_cases_tenant_id', table_name='escalation_cases')
    op.drop_table('escalation_cases')
