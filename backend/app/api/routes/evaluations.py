"""Evaluation and ranking routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.evaluation import Evaluation, EvaluationCategory
from app.models.event import Event
from app.models.session import Session
from app.models.submission import Submission
from app.models.team import Team
from app.models.transcript import Transcript
from app.schemas.evaluation import (
    EvaluationReportResponse,
    EvaluationResponse,
    RankingResponse,
)
from app.services.ai.factory import get_ai_provider
from app.services.evaluation.scoring import ScoringEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])

_scoring = ScoringEngine()


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(
    evaluation_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EvaluationResponse:
    """Get a single evaluation by ID."""
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.scalar_one_or_none()
    if evaluation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return EvaluationResponse.model_validate(evaluation)


@router.get("/team/{team_id}", response_model=list[EvaluationResponse])
async def get_team_evaluations(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[EvaluationResponse]:
    """Get all evaluations for a team."""
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.team_id == team_id)
        .order_by(Evaluation.created_at.desc())
    )
    evaluations = result.scalars().all()
    return [EvaluationResponse.model_validate(e) for e in evaluations]


@router.post("/generate", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def generate_evaluation(
    session_id: int = Query(..., gt=0),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EvaluationResponse:
    """Generate an AI evaluation for a completed session."""
    # Get session
    session_result = await db.execute(select(Session).where(Session.id == session_id))
    session = session_result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Get team
    team_result = await db.execute(select(Team).where(Team.id == session.team_id))
    team = team_result.scalar_one_or_none()

    # Get event for weights
    event_result = await db.execute(select(Event).where(Event.id == session.event_id))
    event = event_result.scalar_one_or_none()

    # Get transcripts
    transcripts_result = await db.execute(
        select(Transcript)
        .where(Transcript.session_id == session_id)
        .order_by(Transcript.timestamp_start)
    )
    transcripts = transcripts_result.scalars().all()

    # Get submissions
    submissions_result = await db.execute(
        select(Submission).where(
            Submission.team_id == session.team_id,
            Submission.event_id == session.event_id,
        )
    )
    submissions = submissions_result.scalars().all()

    # Build session data for AI
    session_data = {
        "session_id": session.id,
        "team_name": team.name if team else "Unknown",
        "project_name": team.project_name if team else None,
        "project_description": team.project_description if team else None,
        "transcripts": [
            {"speaker": t.speaker, "content": t.content, "language": t.language}
            for t in transcripts
        ],
        "submissions": [
            {
                "type": s.submission_type,
                "filename": s.original_filename,
                "extracted_text": s.extracted_text,
                "analysis_result": s.analysis_result,
            }
            for s in submissions
        ],
    }

    # Create evaluation record
    evaluation = Evaluation(
        session_id=session_id,
        team_id=session.team_id,
        event_id=session.event_id,
        status="in_progress",
    )
    db.add(evaluation)
    await db.flush()

    # Generate AI evaluation
    provider = get_ai_provider()
    try:
        ai_result = await provider.generate_evaluation(session_data)
    except Exception as e:
        logger.error("AI evaluation failed: %s", str(e))
        ai_result = {
            "summary": f"[DEMO MODE] Evaluation generation failed: {str(e)}",
            "categories": {},
        }

    # Determine weights
    weights = event.scoring_weights if event and event.scoring_weights else ScoringEngine.DEFAULT_WEIGHTS

    # Create category scores
    categories_data = ai_result.get("categories", {})
    category_scores: dict[str, float] = {}

    for cat_name, weight in weights.items():
        cat_info = categories_data.get(cat_name, {})
        score = cat_info.get("score", 0.0) if isinstance(cat_info, dict) else 0.0
        justification = cat_info.get("justification", "") if isinstance(cat_info, dict) else ""
        evidence = cat_info.get("evidence", []) if isinstance(cat_info, dict) else []

        category = EvaluationCategory(
            evaluation_id=evaluation.id,
            category_name=cat_name,
            weight=weight,
            score=score,
            max_score=100.0,
            justification=justification,
            evidence_references={"evidence": evidence} if evidence else None,
        )
        db.add(category)
        category_scores[cat_name] = score

    # Calculate total weighted score
    total_score = _scoring.calculate_weighted_score(category_scores, weights)
    evaluation.total_score = total_score
    evaluation.summary = ai_result.get("summary", "")
    evaluation.status = "completed"

    await db.commit()
    await db.refresh(evaluation)
    logger.info("Evaluation generated: id=%d score=%.2f", evaluation.id, total_score)
    return EvaluationResponse.model_validate(evaluation)


@router.get("/rankings/{event_id}", response_model=list[RankingResponse])
async def get_rankings(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RankingResponse]:
    """Get team rankings for an event."""
    # Get all completed evaluations for this event
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.event_id == event_id, Evaluation.status == "completed")
        .order_by(Evaluation.total_score.desc())
    )
    evaluations = result.scalars().all()

    rankings: list[RankingResponse] = []
    for eval_obj in evaluations:
        team_result = await db.execute(select(Team).where(Team.id == eval_obj.team_id))
        team = team_result.scalar_one_or_none()

        cat_scores = {}
        for cat in eval_obj.categories:
            cat_scores[cat.category_name] = cat.score or 0.0

        rankings.append(
            RankingResponse(
                rank=0,  # Will be set below
                team_id=eval_obj.team_id,
                team_name=team.name if team else "Unknown",
                project_name=team.project_name if team else None,
                total_score=eval_obj.total_score or 0.0,
                category_scores=cat_scores,
            )
        )

    # Sort and assign ranks with tie handling
    rankings.sort(key=lambda r: r.total_score, reverse=True)
    current_rank = 1
    for i, ranking in enumerate(rankings):
        if i > 0 and ranking.total_score == rankings[i - 1].total_score:
            ranking.rank = rankings[i - 1].rank  # Same rank for ties
        else:
            ranking.rank = current_rank
        current_rank = i + 2  # Next potential rank

    return rankings


@router.post("/rankings/{event_id}/shortlist", response_model=list[RankingResponse])
async def shortlist_teams(
    event_id: int,
    top_n: int = Query(default=10, gt=0),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RankingResponse]:
    """Shortlist the top N teams for an event."""
    all_rankings = await get_rankings(event_id, admin, db)
    shortlisted = all_rankings[:top_n]
    for r in shortlisted:
        r.is_shortlisted = True
    return shortlisted
