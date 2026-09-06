"""Departments CRUD router.

Provides tenant-scoped department management under:
    /tenants/{tenant_id}/departments

Role requirements:
- GET  (list / detail) → viewer, curator, admin
- POST / PATCH / DELETE → admin only
- Superadmins bypass all tenant checks.

Invariants enforced:
- Each tenant has at most one fallback department (DB partial unique index +
  application-level guard).
- The fallback department cannot be deleted; it can only be reassigned.
- ``owner_id`` must belong to the target tenant when provided.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user, require_role
from src.auth.schemas import TokenPayload
from src.db.engine import get_async_session
from src.db.models.department import Department
from src.db.models.user_tenant_role import UserTenantRole

router = APIRouter(
    prefix="/tenants/{tenant_id}/departments",
    tags=["Departments"],
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class DepartmentCreate(BaseModel):
    """Payload for creating a new department."""

    name: str = Field(..., min_length=1, max_length=128, description="Department display name")
    description: str = Field("", max_length=1024, description="Optional description")
    owner_id: Optional[uuid.UUID] = Field(
        None, description="User ID of the department owner (must be a tenant member)"
    )
    is_fallback: bool = Field(
        False,
        description="Mark as the tenant-wide fallback department for unclassified escalations",
    )


class DepartmentUpdate(BaseModel):
    """Payload for updating an existing department (all fields optional)."""

    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=1024)
    owner_id: Optional[uuid.UUID] = None
    is_fallback: Optional[bool] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    """Department representation returned by the API."""

    department_id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str
    owner_id: Optional[uuid.UUID]
    is_fallback: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _resolve_tenant(
    tenant_id: uuid.UUID,
    user: TokenPayload,
) -> uuid.UUID:
    """Validate that the authenticated user may access the requested tenant.

    Superadmins can access any tenant; regular users can only access their
    own tenant.
    """
    if not user.is_superadmin:
        try:
            caller_tenant = uuid.UUID(user.tenant_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid tenant context in token.")
        if caller_tenant != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to the requested tenant.",
            )
    return tenant_id


async def _assert_owner_is_tenant_member(
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: AsyncSession,
) -> None:
    """Raise 422 if owner_id is not a member of tenant_id."""
    stmt = select(UserTenantRole).where(
        UserTenantRole.user_id == owner_id,
        UserTenantRole.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"User {owner_id} is not a member of tenant {tenant_id}.",
        )


async def _get_department_or_404(
    department_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: AsyncSession,
) -> Department:
    stmt = select(Department).where(
        Department.department_id == department_id,
        Department.tenant_id == tenant_id,
    )
    result = await session.execute(stmt)
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department {department_id} not found in tenant {tenant_id}.",
        )
    return dept


async def _assert_no_existing_fallback(
    tenant_id: uuid.UUID,
    session: AsyncSession,
    exclude_id: uuid.UUID | None = None,
) -> None:
    """Raise 409 if the tenant already has a fallback department (other than exclude_id)."""
    stmt = select(Department).where(
        Department.tenant_id == tenant_id,
        Department.is_fallback.is_(True),
    )
    if exclude_id is not None:
        stmt = stmt.where(Department.department_id != exclude_id)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Tenant already has a fallback department: '{existing.name}' "
                f"({existing.department_id}). Update that department first."
            ),
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=List[DepartmentResponse], summary="List departments")
async def list_departments(
    tenant_id: uuid.UUID = Path(..., description="Target tenant UUID"),
    include_inactive: bool = Query(False, description="Include soft-deleted departments"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> List[DepartmentResponse]:
    """Return all departments belonging to *tenant_id*."""
    await _resolve_tenant(tenant_id, user)

    stmt = select(Department).where(Department.tenant_id == tenant_id)
    if not include_inactive:
        stmt = stmt.where(Department.is_active.is_(True))
    stmt = stmt.order_by(Department.created_at).offset(skip).limit(limit)

    result = await session.execute(stmt)
    return [DepartmentResponse.model_validate(d) for d in result.scalars().all()]


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create department")
async def create_department(
    body: DepartmentCreate,
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DepartmentResponse:
    """Create a new department within the tenant.

    Only tenant admins (or superadmins) may create departments.
    If ``is_fallback=True``, the tenant must not already have a fallback
    department.
    """
    await _resolve_tenant(tenant_id, user)

    # Validate owner membership
    if body.owner_id is not None:
        await _assert_owner_is_tenant_member(body.owner_id, tenant_id, session)

    # Enforce single fallback
    if body.is_fallback:
        await _assert_no_existing_fallback(tenant_id, session)

    dept = Department(
        department_id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        owner_id=body.owner_id,
        is_fallback=body.is_fallback,
        is_active=True,
    )
    session.add(dept)
    await session.commit()
    await session.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.get("/{department_id}", response_model=DepartmentResponse, summary="Get department")
async def get_department(
    department_id: uuid.UUID = Path(...),
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DepartmentResponse:
    """Fetch a single department by ID."""
    await _resolve_tenant(tenant_id, user)
    dept = await _get_department_or_404(department_id, tenant_id, session)
    return DepartmentResponse.model_validate(dept)


@router.patch("/{department_id}", response_model=DepartmentResponse, summary="Update department")
async def update_department(
    body: DepartmentUpdate,
    department_id: uuid.UUID = Path(...),
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> DepartmentResponse:
    """Partially update a department.

    Admins may rename, reassign the owner, toggle active state, or promote
    to fallback. Demoting the fallback requires another department to take
    over first (set ``is_fallback=False`` on this one, then promote the other).
    """
    await _resolve_tenant(tenant_id, user)
    dept = await _get_department_or_404(department_id, tenant_id, session)

    if body.owner_id is not None:
        await _assert_owner_is_tenant_member(body.owner_id, tenant_id, session)

    # Promote to fallback: check no other fallback exists
    if body.is_fallback is True and not dept.is_fallback:
        await _assert_no_existing_fallback(tenant_id, session, exclude_id=department_id)

    if body.name is not None:
        dept.name = body.name
    if body.description is not None:
        dept.description = body.description
    if body.owner_id is not None:
        dept.owner_id = body.owner_id
    if body.is_fallback is not None:
        dept.is_fallback = body.is_fallback
    if body.is_active is not None:
        dept.is_active = body.is_active

    await session.commit()
    await session.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete department",
)
async def delete_department(
    department_id: uuid.UUID = Path(...),
    tenant_id: uuid.UUID = Path(...),
    user: TokenPayload = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    """Soft-delete a department by marking it inactive.

    The fallback department cannot be deleted; reassign ``is_fallback`` to
    another department first.
    """
    await _resolve_tenant(tenant_id, user)
    dept = await _get_department_or_404(department_id, tenant_id, session)

    if dept.is_fallback:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete the fallback department. "
                "Promote another department to fallback first."
            ),
        )

    dept.is_active = False
    await session.commit()
