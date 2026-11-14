"""FastAPI dependency injection helpers."""

import logging
from typing import AsyncGenerator

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import verify_token
from app.models.admin import AdminUser
from app.models.team import Team

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and ensure it is closed afterwards."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_admin(
    authorization: str = Header(..., description="Bearer <token>"),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """Validate JWT and return the authenticated admin user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise credentials_exception
        payload = verify_token(token)
        if payload.get("role") != "admin":
            raise credentials_exception
        admin_id: int | None = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    result = await db.execute(select(AdminUser).where(AdminUser.id == int(admin_id)))
    admin = result.scalar_one_or_none()
    if admin is None or not admin.is_active:
        raise credentials_exception
    return admin


async def get_current_team(
    authorization: str = Header(..., description="Bearer <token>"),
    db: AsyncSession = Depends(get_db),
) -> Team:
    """Validate JWT and return the authenticated team."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired team credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise credentials_exception
        payload = verify_token(token)
        if payload.get("role") != "team":
            raise credentials_exception
        team_id: int | None = payload.get("sub")
        if team_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    result = await db.execute(select(Team).where(Team.id == int(team_id)))
    team = result.scalar_one_or_none()
    if team is None or not team.is_active:
        raise credentials_exception
    return team
