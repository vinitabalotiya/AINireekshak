"""Debug and pipeline latency instrumentation endpoints."""

from typing import Any
from fastapi import APIRouter
from app.services.telemetry.latency_tracker import latency_tracker

router = APIRouter(prefix="/api/debug", tags=["debug"])
direct_router = APIRouter(tags=["debug"])


@direct_router.get("/debug/latency")
@router.get("/latency")
async def get_pipeline_latency() -> dict[str, Any]:
    """Get live pipeline latency summary including p50 and p95 per stage."""
    return latency_tracker.get_summary()


@router.post("/latency/reset")
async def reset_pipeline_latency() -> dict[str, str]:
    """Reset recorded latency metrics and traces."""
    latency_tracker.reset()
    return {"status": "success", "message": "Latency metrics reset successfully."}


@router.post("/latency/record-stage")
async def record_stage_latency(data: dict[str, Any]) -> dict[str, Any]:
    """Record a stage latency directly (useful for client-side playback reports)."""
    stage = data.get("stage", "playback_latency")
    duration = float(data.get("duration_ms", 0.0))
    metadata = data.get("metadata", {})
    latency_tracker.record_stage(stage, duration, metadata)
    return {"status": "success", "recorded_ms": duration}
