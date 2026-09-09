import asyncio
import os
import sys
import uuid

# Add root directory to sys.path to allow imports from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.auth.security import hash_password
from src.db.engine import get_async_session
from src.db.models.department import Department
from src.db.models.document import DocumentModel
from src.db.models.tenant import Tenant
from src.db.models.user import User
from src.db.models.user_tenant_role import UserTenantRole


async def seed_data():
    async for session in get_async_session():
        # Create a Mock Tenant
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            tenant_id=tenant_id, name="Acme Corp (Simulator)", slug="acme-sim", status="active"
        )
        session.add(tenant)
        await session.commit()

        # Create Users
        admin_id = uuid.uuid4()
        admin_user = User(
            user_id=admin_id,
            email="admin@acmecorp.com",
            hashed_password=hash_password("password123"),
            full_name="Alice Admin",
            is_active=True,
        )

        dept_admin_id = uuid.uuid4()
        dept_admin_user = User(
            user_id=dept_admin_id,
            email="finance@acmecorp.com",
            hashed_password=hash_password("password123"),
            full_name="Bob Finance",
            is_active=True,
        )

        session.add_all([admin_user, dept_admin_user])
        await session.commit()

        # Assign Roles
        admin_role = UserTenantRole(user_id=admin_id, tenant_id=tenant_id, role="admin")
        dept_role = UserTenantRole(user_id=dept_admin_id, tenant_id=tenant_id, role="curator")

        session.add_all([admin_role, dept_role])
        await session.commit()

        # Create Departments
        engineering = Department(
            department_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="Engineering",
            owner_id=admin_id,
            is_fallback=True,
        )

        finance = Department(
            department_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="Finance",
            owner_id=dept_admin_id,
            is_fallback=False,
        )

        hr = Department(
            department_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="HR",
            owner_id=admin_id,
            is_fallback=False,
        )

        project_phoenix = Department(
            department_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="Project Phoenix",
            owner_id=dept_admin_id,
            is_fallback=False,
        )

        session.add_all([engineering, finance, hr, project_phoenix])
        await session.commit()

        # Create Documents
        doc1 = DocumentModel(
            doc_id=uuid.uuid4(),
            tenant_id=tenant_id,
            owner_id=admin_id,
            filename="architecture.pdf",
            title="System Architecture Q3",
            mime_type="application/pdf",
            file_size_bytes=1024,
            chunk_count=10,
            status="active",
            access_policy={"roles": ["admin"], "user_ids": [], "is_public": False},
        )

        doc2 = DocumentModel(
            doc_id=uuid.uuid4(),
            tenant_id=tenant_id,
            owner_id=dept_admin_id,
            filename="q3_budget.xlsx",
            title="Q3 Budget Projection",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file_size_bytes=2048,
            chunk_count=5,
            status="active",
            access_policy={
                "roles": ["curator"],
                "user_ids": [str(dept_admin_id)],
                "is_public": False,
            },
        )

        session.add_all([doc1, doc2])
        await session.commit()

        print("✅ Seeding Complete!")
        print(f"Tenant: {tenant.name} (Slug: {tenant.slug})")
        print(f"Admin Login: {admin_user.email} / password123")
        print(f"Dept Admin Login: {dept_admin_user.email} / password123")


if __name__ == "__main__":
    asyncio.run(seed_data())
