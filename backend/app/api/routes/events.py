"""Event CRUD routes (admin-only)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_team_or_admin, get_db
from app.models.admin import AdminUser
from app.models.event import Event
from app.models.session import Session
from app.models.team import Team
from app.schemas.event import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventUpdate,
    ScoringWeights,
)
from app.schemas.session import SessionResponse
from app.schemas.team import TeamResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=EventListResponse)
async def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventListResponse:
    """List all events with optional status filter."""
    query = select(Event)
    count_query = select(func.count()).select_from(Event)

    if status_filter:
        query = query.where(Event.status == status_filter)
        count_query = count_query.where(Event.status == status_filter)

    query = query.order_by(Event.created_at.desc()).offset(skip).limit(limit)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    events = result.scalars().all()

    return EventListResponse(
        items=[EventResponse.model_validate(e) for e in events],
        total=total,
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Create a new event."""
    event = Event(
        name=body.name,
        description=body.description,
        start_date=body.start_date,
        end_date=body.end_date,
        max_teams=body.max_teams,
        scoring_weights=body.scoring_weights.model_dump() if body.scoring_weights else None,
        created_by=admin.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    logger.info("Event created: id=%d name=%s", event.id, event.name)
    return EventResponse.model_validate(event)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Get a single event by ID."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return EventResponse.model_validate(event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    body: EventUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Update an existing event."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    update_data = body.model_dump(exclude_unset=True)
    if "scoring_weights" in update_data and update_data["scoring_weights"] is not None:
        update_data["scoring_weights"] = update_data["scoring_weights"].model_dump()

    for field, value in update_data.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    logger.info("Event updated: id=%d", event.id)
    return EventResponse.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an event."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    await db.delete(event)
    await db.commit()
    logger.info("Event deleted: id=%d", event_id)


@router.get("/{event_id}/teams", response_model=list[TeamResponse])
async def get_event_teams(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[TeamResponse]:
    """List all teams for a given event."""
    # Verify event exists
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    if event_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    result = await db.execute(select(Team).where(Team.event_id == event_id).order_by(Team.name))
    teams = result.scalars().all()
    return [TeamResponse.model_validate(t) for t in teams]


@router.get("/{event_id}/sessions", response_model=list[SessionResponse])
async def get_event_sessions(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SessionResponse]:
    """List all sessions for a given event."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    if event_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    result = await db.execute(
        select(Session).where(Session.event_id == event_id).order_by(Session.scheduled_start)
    )
    sessions = result.scalars().all()
    return [SessionResponse.model_validate(s) for s in sessions]


@router.put("/{event_id}/scoring-weights", response_model=EventResponse)
async def update_scoring_weights(
    event_id: int,
    weights: ScoringWeights,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Update the scoring weights for an event."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event.scoring_weights = weights.model_dump()
    await db.commit()
    await db.refresh(event)
    logger.info("Scoring weights updated for event id=%d", event_id)
    return EventResponse.model_validate(event)
