"""Admin routes for dashboard, profile, and settings."""

import logging
import os
from pathlib import Path
from pydantic import BaseModel, Field

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.evaluation import Evaluation
from app.models.event import Event
from app.models.session import Session
from app.models.team import Team

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AIKeysUpdate(BaseModel):
    """Schema for updating AI API keys from the admin panel."""

    gemini_api_key: str | None = Field(None, description="Google Gemini API key")
    openai_api_key: str | None = Field(None, description="OpenAI API key")


class AIKeyTestRequest(BaseModel):
    """Schema for testing an AI key."""

    provider: str = Field(default="gemini", description="Provider to test: 'gemini' or 'openai'")
    api_key: str | None = Field(None, description="Optional key to test before saving")


def _mask_key(key: str | None) -> str | None:
    if not key or len(key.strip()) < 8:
        return None
    k = key.strip()
    return f"{k[:4]}...{k[-4:]}"


def _persist_env_var(key: str, value: str) -> None:
    """Update setting in memory and persist permanently in both backend and root .env files."""
    os.environ[key] = value
    setattr(settings, key, value)

    backend_dir = Path(__file__).resolve().parent.parent.parent.parent
    root_dir = backend_dir.parent

    target_env_files = [backend_dir / ".env", root_dir / ".env"]

    for env_file in target_env_files:
        lines = []
        found = False
        if env_file.exists():
            try:
                lines = env_file.read_text(encoding="utf-8").splitlines()
                for i, line in enumerate(lines):
                    stripped = line.strip()
                    if stripped.startswith(f"{key}=") or stripped.startswith(f"# {key}="):
                        lines[i] = f"{key}={value}"
                        found = True
                        break
            except Exception as e:
                logger.warning("Could not read %s: %s", env_file, e)

        if not found:
            lines.append(f"{key}={value}")

        try:
            env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
            logger.info("Permanently persisted %s to %s", key, env_file)
        except Exception as e:
            logger.warning("Could not write %s: %s", env_file, e)


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

    # Counts by status
    active_sessions = sessions_by_status.get("active", 0)
    pending_sessions = sessions_by_status.get("scheduled", 0) + sessions_by_status.get("waiting", 0)
    completed_sessions = sessions_by_status.get("completed", 0)

    # Fetch recent sessions (up to 10)
    recent_sess_res = await db.execute(
        select(Session).order_by(Session.created_at.desc()).limit(10)
    )
    recent_sessions = [
        {
            "id": s.id,
            "team_id": s.team_id,
            "event_id": s.event_id,
            "duration_minutes": s.duration_minutes or 20,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in recent_sess_res.scalars().all()
    ]

    # Fetch top evaluated teams
    top_evals_res = await db.execute(
        select(Evaluation)
        .where(Evaluation.status == "completed")
        .order_by(Evaluation.total_score.desc())
        .limit(5)
    )
    top_teams = []
    for ev in top_evals_res.scalars().all():
        t_res = await db.execute(select(Team).where(Team.id == ev.team_id))
        team = t_res.scalar_one_or_none()
        top_teams.append({
            "team_id": ev.team_id,
            "team_name": team.name if team else f"Team #{ev.team_id}",
            "project_name": team.project_name if team else None,
            "total_score": ev.total_score or 0.0,
        })

    return {
        "total_events": total_events,
        "active_events": active_events,
        "total_teams": total_teams,
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "pending_sessions": pending_sessions,
        "completed_sessions": completed_sessions,
        "sessions_by_status": sessions_by_status,
        "average_score": round(avg_score, 2) if avg_score else 0.0,
        "recent_sessions": recent_sessions,
        "top_teams": top_teams,
    }


@router.get("/settings/ai-keys")
async def get_ai_keys_status(admin: AdminUser = Depends(get_current_admin)) -> dict:
    """Return status of configured AI API keys."""
    return {
        "gemini": {
            "configured": bool(settings.GEMINI_API_KEY),
            "masked_key": _mask_key(settings.GEMINI_API_KEY),
        },
        "openai": {
            "configured": bool(settings.OPENAI_API_KEY),
            "masked_key": _mask_key(settings.OPENAI_API_KEY),
        },
        "active_provider": "gemini" if settings.GEMINI_API_KEY else "demo",
    }


@router.post("/settings/ai-keys")
async def update_ai_keys(
    body: AIKeysUpdate,
    admin: AdminUser = Depends(get_current_admin),
) -> dict:
    """Update and persist AI API keys from the admin dashboard."""
    if body.gemini_api_key is not None:
        key = body.gemini_api_key.strip()
        _persist_env_var("GEMINI_API_KEY", key)
        logger.info("Admin updated GEMINI_API_KEY (configured=%s)", bool(key))

    if body.openai_api_key is not None:
        key = body.openai_api_key.strip()
        _persist_env_var("OPENAI_API_KEY", key)
        logger.info("Admin updated OPENAI_API_KEY (configured=%s)", bool(key))

    return {
        "status": "success",
        "message": "AI configuration updated successfully.",
        "settings": {
            "gemini": {
                "configured": bool(settings.GEMINI_API_KEY),
                "masked_key": _mask_key(settings.GEMINI_API_KEY),
            },
            "openai": {
                "configured": bool(settings.OPENAI_API_KEY),
                "masked_key": _mask_key(settings.OPENAI_API_KEY),
            },
            "active_provider": "gemini" if settings.GEMINI_API_KEY else "demo",
        },
    }


@router.post("/settings/ai-keys/test")
async def test_ai_key(
    body: AIKeyTestRequest,
    admin: AdminUser = Depends(get_current_admin),
) -> dict:
    """Test connectivity of a given or configured AI API key."""
    target_key = (body.api_key or (settings.GEMINI_API_KEY if body.provider == "gemini" else settings.OPENAI_API_KEY) or "").strip()

    if not target_key:
        return {
            "valid": False,
            "message": f"No API key provided or configured for provider '{body.provider}'.",
        }

    if body.provider == "gemini":
        try:
            # Query Gemini models endpoint to verify key validity
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={target_key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])[:3]]
                    return {
                        "valid": True,
                        "message": f"Gemini API key is active! Available models: {', '.join(models) if models else 'gemini-1.5-flash'}",
                    }
                else:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message", resp.text[:150])
                    return {
                        "valid": False,
                        "message": f"Gemini validation failed (HTTP {resp.status_code}): {err_msg}",
                    }
        except Exception as e:
            return {"valid": False, "message": f"Connection error: {str(e)}"}

    elif body.provider == "openai":
        try:
            url = "https://api.openai.com/v1/models"
            headers = {"Authorization": f"Bearer {target_key}"}
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {"valid": True, "message": "OpenAI API key verified successfully!"}
                else:
                    return {"valid": False, "message": f"OpenAI error (HTTP {resp.status_code}): {resp.text[:120]}"}
        except Exception as e:
            return {"valid": False, "message": f"Connection error: {str(e)}"}

    return {"valid": False, "message": f"Unsupported provider: {body.provider}"}
