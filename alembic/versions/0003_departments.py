"""Add departments table.

Revision ID: 0003_departments
Revises: 0002_document_acl_and_audit_log
Create Date: 2026-09-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0003_departments'
down_revision: Union[str, None] = '0002_document_acl_and_audit_log'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'departments',
        sa.Column(
            'department_id',
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
            'name',
            sa.String(length=128),
            nullable=False,
        ),
        sa.Column(
            'description',
            sa.Text(),
            server_default='',
            nullable=False,
        ),
        sa.Column(
            'owner_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.user_id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'is_fallback',
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
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

    # Indexes
    op.create_index('ix_departments_tenant_id', 'departments', ['tenant_id'])
    op.create_index('ix_departments_owner_id', 'departments', ['owner_id'])
    op.create_index('ix_departments_is_fallback', 'departments', ['is_fallback'])

    # Enforce at most one fallback department per tenant using a partial unique index
    op.create_index(
        'uq_departments_one_fallback_per_tenant',
        'departments',
        ['tenant_id'],
        unique=True,
        postgresql_where=sa.text('is_fallback = true'),
    )


def downgrade() -> None:
    op.drop_index('uq_departments_one_fallback_per_tenant', table_name='departments')
    op.drop_index('ix_departments_is_fallback', table_name='departments')
    op.drop_index('ix_departments_owner_id', table_name='departments')
    op.drop_index('ix_departments_tenant_id', table_name='departments')
    op.drop_table('departments')
