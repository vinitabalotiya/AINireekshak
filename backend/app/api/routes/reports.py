"""Report export routes (CSV, Excel)."""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.evaluation import Evaluation
from app.models.event import Event
from app.models.session import Session
from app.models.team import Team
from app.schemas.evaluation import RankingResponse
from app.services.evaluation.report_export import ReportExporter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])

_exporter = ReportExporter()


async def _build_rankings(event_id: int, db: AsyncSession) -> list[RankingResponse]:
    """Build ranking list for an event (shared helper)."""
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
        cat_scores = {cat.category_name: cat.score or 0.0 for cat in eval_obj.categories}

        # Look up session for liveness status & behavior score
        sess_result = await db.execute(select(Session).where(Session.id == eval_obj.session_id))
        sess_obj = sess_result.scalar_one_or_none()
        liveness_stat = "Verified"
        behav_score = 85.0
        if sess_obj:
            if getattr(sess_obj, "liveness_flag", None) in ("LIVENESS_FAILED", "FLAGGED"):
                liveness_stat = "Flagged"
            elif getattr(sess_obj, "liveness_flag", None) == "ERRORED":
                liveness_stat = "Errored"
            elif getattr(sess_obj, "liveness_flag", None) == "VERIFIED":
                liveness_stat = "Verified"

            if getattr(sess_obj, "behavioural_data", None):
                behav_score = sess_obj.behavioural_data.get("normalizedScore") or sess_obj.behavioural_data.get("averageAttention") or 85.0

        rankings.append(
            RankingResponse(
                rank=0,
                team_id=eval_obj.team_id,
                team_name=team.name if team else "Unknown",
                project_name=team.project_name if team else None,
                total_score=eval_obj.total_score or 0.0,
                category_scores=cat_scores,
                liveness_status=liveness_stat,
                behaviour_score=round(float(behav_score), 1),
            )
        )

    rankings.sort(key=lambda r: r.total_score, reverse=True)
    current_rank = 1
    for i, ranking in enumerate(rankings):
        if i > 0 and ranking.total_score == rankings[i - 1].total_score:
            ranking.rank = rankings[i - 1].rank
        else:
            ranking.rank = current_rank
        current_rank = i + 2
    return rankings


@router.get("/event/{event_id}/export/csv")
async def export_csv(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export event rankings as CSV."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    event_name = event.name if event else f"event_{event_id}"

    rankings = await _build_rankings(event_id, db)
    csv_bytes = _exporter.export_csv(rankings, event_name)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{event_name}_rankings.csv"'},
    )


@router.get("/event/{event_id}/export/excel")
async def export_excel(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export event rankings as Excel."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    event_name = event.name if event else f"event_{event_id}"

    rankings = await _build_rankings(event_id, db)
    excel_bytes = _exporter.export_excel(rankings, event_name)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{event_name}_rankings.xlsx"'},
    )
