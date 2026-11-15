"""Team CRUD routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_team_or_admin, get_db
from app.core.security import generate_team_access_code
from app.models.admin import AdminUser
from app.models.event import Event
from app.models.evaluation import Evaluation
from app.models.submission import Submission
from app.models.team import Team, TeamMember
from app.schemas.evaluation import EvaluationResponse
from app.schemas.submission import SubmissionResponse
from app.schemas.team import (
    TeamAccessCodeResponse,
    TeamCreate,
    TeamListResponse,
    TeamResponse,
    TeamUpdate,
)
from app.utils.csv_import import parse_teams_csv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=TeamListResponse)
async def list_teams(
    event_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TeamListResponse:
    """List teams with optional event filter."""
    query = select(Team)
    count_query = select(func.count()).select_from(Team)

    if event_id is not None:
        query = query.where(Team.event_id == event_id)
        count_query = count_query.where(Team.event_id == event_id)

    query = query.order_by(Team.name).offset(skip).limit(limit)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    teams = result.scalars().all()
    return TeamListResponse(
        items=[TeamResponse.model_validate(t) for t in teams],
        total=total,
    )


@router.post("", response_model=TeamAccessCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TeamAccessCodeResponse:
    """Create a new team and return the access code (shown only once)."""
    # Verify event exists
    event_result = await db.execute(select(Event).where(Event.id == body.event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Check max teams
    if event.max_teams:
        team_count_result = await db.execute(
            select(func.count()).select_from(Team).where(Team.event_id == body.event_id)
        )
        current_count = team_count_result.scalar() or 0
        if current_count >= event.max_teams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Event has reached maximum team limit ({event.max_teams})",
            )

    plain_code, hashed_code = generate_team_access_code()

    team = Team(
        event_id=body.event_id,
        name=body.name,
        project_name=body.project_name,
        project_description=body.project_description,
        members_count=len(body.members),
        access_code_hash=hashed_code,
    )
    db.add(team)
    await db.flush()

    # Add members
    for member_data in body.members:
        member = TeamMember(
            team_id=team.id,
            name=member_data.name,
            email=member_data.email,
            role=member_data.role,
        )
        db.add(member)

    await db.commit()
    await db.refresh(team)

    logger.info("Team created: id=%d name=%s event_id=%d", team.id, team.name, team.event_id)
    return TeamAccessCodeResponse(
        team=TeamResponse.model_validate(team),
        access_code=plain_code,
    )


@router.post("/import", response_model=list[TeamAccessCodeResponse], status_code=status.HTTP_201_CREATED)
async def import_teams(
    event_id: int = Query(..., gt=0),
    file: UploadFile = ...,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[TeamAccessCodeResponse]:
    """Import teams from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are accepted")

    content = await file.read()
    rows = parse_teams_csv(content.decode("utf-8-sig"))

    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty or invalid")

    results: list[TeamAccessCodeResponse] = []

    for row in rows:
        plain_code, hashed_code = generate_team_access_code()
        team = Team(
            event_id=event_id,
            name=row.team_name,
            project_name=row.project_name,
            members_count=len(row.members),
            access_code_hash=hashed_code,
        )
        db.add(team)
        await db.flush()

        for member_data in row.members:
            member = TeamMember(
                team_id=team.id,
                name=member_data.name,
                email=member_data.email,
                role=member_data.role,
            )
            db.add(member)

        await db.flush()
        await db.refresh(team)

        results.append(
            TeamAccessCodeResponse(
                team=TeamResponse.model_validate(team),
                access_code=plain_code,
            )
        )

    await db.commit()
    logger.info("Imported %d teams for event_id=%d", len(results), event_id)
    return results


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Get a single team by ID."""
    if user["role"] == "team" and user["id"] != team_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other teams' details")
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return TeamResponse.model_validate(team)


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    body: TeamUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Update a team."""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    await db.commit()
    await db.refresh(team)
    logger.info("Team updated: id=%d", team.id)
    return TeamResponse.model_validate(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a team."""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    await db.delete(team)
    await db.commit()
    logger.info("Team deleted: id=%d", team_id)


@router.post("/{team_id}/regenerate-code", response_model=TeamAccessCodeResponse)
async def regenerate_access_code(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TeamAccessCodeResponse:
    """Regenerate the access code for a team."""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    plain_code, hashed_code = generate_team_access_code()
    team.access_code_hash = hashed_code
    await db.commit()
    await db.refresh(team)

    logger.info("Access code regenerated for team id=%d", team.id)
    return TeamAccessCodeResponse(
        team=TeamResponse.model_validate(team),
        access_code=plain_code,
    )


@router.get("/{team_id}/submissions", response_model=list[SubmissionResponse])
async def get_team_submissions(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SubmissionResponse]:
    """List all submissions for a team."""
    result = await db.execute(
        select(Submission).where(Submission.team_id == team_id).order_by(Submission.created_at.desc())
    )
    submissions = result.scalars().all()
    return [SubmissionResponse.model_validate(s) for s in submissions]


@router.get("/{team_id}/evaluation", response_model=EvaluationResponse | None)
async def get_team_evaluation(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EvaluationResponse | None:
    """Get the latest evaluation for a team."""
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.team_id == team_id)
        .order_by(Evaluation.created_at.desc())
        .limit(1)
    )
    evaluation = result.scalar_one_or_none()
    if evaluation is None:
        return None
    return EvaluationResponse.model_validate(evaluation)
