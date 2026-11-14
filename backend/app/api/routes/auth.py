"""Authentication routes for admin and team login."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_access_code,
    verify_password,
)
from app.models.admin import AdminUser
from app.models.team import Team
from app.schemas.auth import AdminCreate, AdminLogin, TeamLogin, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(body: AdminLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Authenticate an admin user and return a JWT token."""
    result = await db.execute(select(AdminUser).where(AdminUser.username == body.username))
    admin = result.scalar_one_or_none()

    if admin is None or not verify_password(body.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token(data={"sub": str(admin.id)}, role="admin")
    logger.info("Admin login successful: %s", admin.username)
    return TokenResponse(
        access_token=token,
        role="admin",
        user_id=admin.id,
        username=admin.username,
    )


@router.post("/admin/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def admin_register(body: AdminCreate, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Register the first admin user. Only works when no admins exist."""
    count_result = await db.execute(select(func.count()).select_from(AdminUser))
    count = count_result.scalar() or 0

    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin registration is closed. An admin already exists.",
        )

    # Check for duplicate email/username
    existing = await db.execute(
        select(AdminUser).where((AdminUser.email == body.email) | (AdminUser.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already taken",
        )

    admin = AdminUser(
        email=body.email,
        username=body.username,
        password_hash=hash_password(body.password),
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token = create_access_token(data={"sub": str(admin.id)}, role="admin")
    logger.info("First admin registered: %s", admin.username)
    return TokenResponse(
        access_token=token,
        role="admin",
        user_id=admin.id,
        username=admin.username,
    )


@router.post("/team/login", response_model=TokenResponse)
async def team_login(body: TeamLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Authenticate a team using team name and access code."""
    query = select(Team).where(Team.name == body.team_name)
    if body.event_id is not None:
        query = query.where(Team.event_id == body.event_id)

    result = await db.execute(query.order_by(Team.id.desc()))
    teams = result.scalars().all()

    matched_team = None
    for t in teams:
        if verify_access_code(body.access_code, t.access_code_hash):
            matched_team = t
            break

    if matched_team is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid team name or access code",
        )
    if not matched_team.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team is deactivated",
        )

    token = create_access_token(data={"sub": str(matched_team.id), "event_id": matched_team.event_id}, role="team")
    logger.info("Team login successful: %s", matched_team.name)
    return TokenResponse(
        access_token=token,
        role="team",
        user_id=matched_team.id,
        username=matched_team.name,
    )
