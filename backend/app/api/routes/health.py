"""Health check endpoint."""

import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """Return health status including service connectivity."""
    result: dict = {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "services": {},
    }

    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        result["services"]["database"] = {"status": "connected", "type": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"}
    except Exception as e:
        result["services"]["database"] = {"status": "disconnected", "error": str(e)}
        result["status"] = "degraded"

    # Check Redis (best-effort)
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        result["services"]["redis"] = {"status": "connected"}
        await r.aclose()
    except Exception:
        result["services"]["redis"] = {"status": "disconnected", "note": "Optional - not required for basic operation"}

    # Check AI providers
    result["services"]["ai"] = {
        "gemini": "configured" if settings.GEMINI_API_KEY else "not configured (demo mode)",
        "openai": "configured" if settings.OPENAI_API_KEY else "not configured",
    }

    # LiveKit
    result["services"]["livekit"] = {
        "status": "configured" if settings.LIVEKIT_URL else "not configured",
    }

    return result
