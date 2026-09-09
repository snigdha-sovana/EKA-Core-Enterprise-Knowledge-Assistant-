"""Seed superadmin user and default tenant into PostgreSQL."""

from __future__ import annotations

import argparse
import asyncio
import logging
import uuid

from sqlalchemy import select

from src.auth.security import hash_password
from src.db import engine as db_engine
from src.db.models.tenant import Tenant
from src.db.models.user import User
from src.db.models.user_tenant_role import UserTenantRole

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_superadmin")


async def seed_superadmin(
    email: str,
    password: str,
    tenant_slug: str = "default",
    tenant_name: str = "Default Organization",
) -> None:
    """Create or update default tenant, superadmin user, and role association."""
    db_engine.get_engine()
    assert db_engine.AsyncSessionLocal is not None

    async with db_engine.AsyncSessionLocal() as session:
        # 1. Ensure Tenant exists
        t_stmt = select(Tenant).where(Tenant.slug == tenant_slug)
        t_res = await session.execute(t_stmt)
        tenant = t_res.scalar_one_or_none()

        if not tenant:
            tenant = Tenant(
                tenant_id=uuid.uuid4(),
                slug=tenant_slug,
                name=tenant_name,
                status="active",
                doc_cap=100,
                config={},
            )
            session.add(tenant)
            await session.flush()
            logger.info("Created tenant '%s' (ID: %s)", tenant.slug, tenant.tenant_id)
        else:
            logger.info("Found existing tenant '%s' (ID: %s)", tenant.slug, tenant.tenant_id)

        # 2. Ensure User exists
        u_stmt = select(User).where(User.email == email.lower().strip())
        u_res = await session.execute(u_stmt)
        user = u_res.scalar_one_or_none()

        if not user:
            user = User(
                user_id=uuid.uuid4(),
                email=email.lower().strip(),
                password_hash=hash_password(password),
                display_name="Super Administrator",
                is_active=True,
                is_superadmin=True,
            )
            session.add(user)
            await session.flush()
            logger.info("Created superadmin user '%s' (ID: %s)", user.email, user.user_id)
        else:
            user.password_hash = hash_password(password)
            user.is_superadmin = True
            user.is_active = True
            logger.info("Updated existing user '%s' to superadmin", user.email)

        # 3. Ensure UserTenantRole exists
        r_stmt = select(UserTenantRole).where(
            UserTenantRole.user_id == user.user_id,
            UserTenantRole.tenant_id == tenant.tenant_id,
        )
        r_res = await session.execute(r_stmt)
        role_entry = r_res.scalar_one_or_none()

        if not role_entry:
            role_entry = UserTenantRole(
                user_id=user.user_id,
                tenant_id=tenant.tenant_id,
                role="admin",
            )
            session.add(role_entry)
            logger.info("Assigned 'admin' role to %s in tenant %s", user.email, tenant.slug)

        await session.commit()
        print("\n" + "=" * 60)
        print(" Superadmin Seeding Complete")
        print("=" * 60)
        print(f" Tenant Slug : {tenant.slug}")
        print(f" Tenant ID   : {tenant.tenant_id}")
        print(f" User Email  : {user.email}")
        print(f" User ID     : {user.user_id}")
        print(f" Role        : admin")
        print("=" * 60 + "\n")

        await db_engine.close_db_engine()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed superadmin user and default tenant.")
    parser.add_argument("--email", default="admin@company.com", help="Superadmin email address")
    parser.add_argument("--password", default="changeme123", help="Superadmin password")
    parser.add_argument("--tenant-slug", default="default", help="Default tenant slug")
    parser.add_argument("--tenant-name", default="Default Organization", help="Default tenant display name")

    args = parser.parse_args()
    asyncio.run(seed_superadmin(args.email, args.password, args.tenant_slug, args.tenant_name))


if __name__ == "__main__":
    main()
