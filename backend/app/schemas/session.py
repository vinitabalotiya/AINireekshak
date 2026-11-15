"""Session-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Schema for creating a judging session."""

    team_id: int = Field(..., gt=0)
    event_id: int = Field(..., gt=0)
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    duration_minutes: int | None = Field(default=30, gt=0, le=180)


class SessionUpdate(BaseModel):
    """Schema for updating a session."""

    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: str | None = Field(default=None, pattern=r"^(scheduled|waiting|active|completed|cancelled)$")
    duration_minutes: int | None = Field(default=None, gt=0, le=180)


class SessionResponse(BaseModel):
    """Schema for session response."""

    id: int
    team_id: int
    event_id: int
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    actual_start: datetime | None = None
    actual_end: datetime | None = None
    status: str
    duration_minutes: int | None = None
    livekit_room_name: str | None = None
    liveness_flag: str = "PENDING"
    liveness_data: dict | None = None
    behavioural_data: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    """Schema for paginated session list."""

    items: list[SessionResponse]
    total: int
