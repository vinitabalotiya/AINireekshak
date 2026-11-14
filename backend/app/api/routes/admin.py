"""Admin routes for dashboard and profile."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.evaluation import Evaluation
from app.models.event import Event
from app.models.session import Session
from app.models.team import Team

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/me")
async def get_current_admin_info(admin: AdminUser = Depends(get_current_admin)) -> dict:
    """Return the current authenticated admin's info."""
    return {
        "id": admin.id,
        "email": admin.email,
        "username": admin.username,
        "is_active": admin.is_active,
        "created_at": admin.created_at.isoformat() if admin.created_at else None,
    }


@router.get("/dashboard")
async def get_dashboard_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return dashboard statistics: events, teams, sessions, scores."""
    # Total events
    events_result = await db.execute(select(func.count()).select_from(Event))
    total_events = events_result.scalar() or 0

    # Total teams
    teams_result = await db.execute(select(func.count()).select_from(Team))
    total_teams = teams_result.scalar() or 0

    # Sessions by status
    session_counts_result = await db.execute(
        select(Session.status, func.count()).group_by(Session.status)
    )
    sessions_by_status = {row[0]: row[1] for row in session_counts_result.all()}

    total_sessions = sum(sessions_by_status.values())

    # Average evaluation score
    avg_score_result = await db.execute(
        select(func.avg(Evaluation.total_score)).where(Evaluation.status == "completed")
    )
    avg_score = avg_score_result.scalar()

    # Active events
    active_events_result = await db.execute(
        select(func.count()).select_from(Event).where(Event.status == "active")
    )
    active_events = active_events_result.scalar() or 0

    return {
        "total_events": total_events,
        "active_events": active_events,
        "total_teams": total_teams,
        "total_sessions": total_sessions,
        "sessions_by_status": sessions_by_status,
        "average_score": round(avg_score, 2) if avg_score else None,
    }
