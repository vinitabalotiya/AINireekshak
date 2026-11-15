"""Session management routes."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_team_or_admin, get_db
from app.models.admin import AdminUser
from app.models.session import Session
from app.models.team import Team
from app.models.transcript import Transcript
from app.schemas.session import (
    SessionCreate,
    SessionListResponse,
    SessionResponse,
    SessionUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    event_id: int | None = Query(None),
    team_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    """List sessions with filters and team isolation."""
    query = select(Session)
    count_query = select(func.count()).select_from(Session)

    if user["role"] == "team":
        # Force team isolation: team can only view its own sessions
        query = query.where(Session.team_id == user["id"])
        count_query = count_query.where(Session.team_id == user["id"])
    else:
        if team_id is not None:
            query = query.where(Session.team_id == team_id)
            count_query = count_query.where(Session.team_id == team_id)

    if event_id is not None:
        query = query.where(Session.event_id == event_id)
        count_query = count_query.where(Session.event_id == event_id)
    if status_filter:
        query = query.where(Session.status == status_filter)
        count_query = count_query.where(Session.status == status_filter)

    query = query.order_by(Session.created_at.desc()).offset(skip).limit(limit)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    sessions = result.scalars().all()

    return SessionListResponse(
        items=[SessionResponse.model_validate(s) for s in sessions],
        total=total,
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Create a new judging session."""
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == body.team_id))
    team = team_result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    room_name = f"session-{uuid.uuid4().hex[:12]}"

    session = Session(
        team_id=body.team_id,
        event_id=body.event_id,
        scheduled_start=body.scheduled_start,
        scheduled_end=body.scheduled_end,
        duration_minutes=body.duration_minutes,
        livekit_room_name=room_name,
        status="scheduled",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info("Session created: id=%d team_id=%d event_id=%d", session.id, session.team_id, session.event_id)
    return SessionResponse.model_validate(session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Get session details."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if user["role"] == "team" and session.team_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other teams' sessions")
    return SessionResponse.model_validate(session)


@router.put("/{session_id}/status", response_model=SessionResponse)
async def update_session_status(
    session_id: int,
    body: SessionUpdate,
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Update session status and related fields."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if user["role"] == "team" and session.team_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify other teams' sessions")

    update_data = body.model_dump(exclude_unset=True)

    # Handle status transitions
    new_status = update_data.get("status")
    if new_status == "active" and session.actual_start is None:
        session.actual_start = datetime.now(timezone.utc)
    elif new_status in ("completed", "cancelled") and session.actual_end is None:
        session.actual_end = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(session, field, value)

    await db.commit()
    await db.refresh(session)
    logger.info("Session status updated: id=%d status=%s", session.id, session.status)
    return SessionResponse.model_validate(session)


@router.get("/{session_id}/transcript")
async def get_session_transcript(
    session_id: int,
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get the full transcript for a session."""
    session_res = await db.execute(select(Session).where(Session.id == session_id))
    session = session_res.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if user["role"] == "team" and session.team_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other teams' transcripts")

    result = await db.execute(
        select(Transcript)
        .where(Transcript.session_id == session_id)
        .order_by(Transcript.timestamp_start, Transcript.created_at)
    )
    transcripts = result.scalars().all()
    return [
        {
            "id": t.id,
            "speaker": t.speaker,
            "content": t.content,
            "language": t.language,
            "romanized_content": t.romanized_content,
            "confidence": t.confidence,
            "timestamp_start": t.timestamp_start,
            "timestamp_end": t.timestamp_end,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in transcripts
    ]
