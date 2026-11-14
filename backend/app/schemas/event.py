"""Event-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ScoringWeights(BaseModel):
    """Scoring weight configuration for an event (must sum to exactly 100%)."""

    pitch_technical: float = Field(default=60.0, ge=0, le=100)
    presentation: float = Field(default=15.0, ge=0, le=100)
    code_implementation: float = Field(default=8.0, ge=0, le=100)
    feasibility: float = Field(default=7.0, ge=0, le=100)
    innovation: float = Field(default=5.0, ge=0, le=100)
    problem_relevance: float = Field(default=5.0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_sum_100(self) -> "ScoringWeights":
        total = (
            self.pitch_technical
            + self.presentation
            + self.code_implementation
            + self.feasibility
            + self.innovation
            + self.problem_relevance
        )
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"Scoring weights must sum to exactly 100%. Current sum: {total:.2f}%")
        return self


class EventCreate(BaseModel):
    """Schema for creating an event."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_teams: int | None = Field(default=None, gt=0)
    scoring_weights: ScoringWeights | None = None


class EventUpdate(BaseModel):
    """Schema for updating an event."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|active|completed)$")
    max_teams: int | None = Field(default=None, gt=0)
    scoring_weights: ScoringWeights | None = None


class EventResponse(BaseModel):
    """Schema for event response."""

    id: int
    name: str
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str
    max_teams: int | None = None
    scoring_weights: dict | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    """Schema for paginated event list."""

    items: list[EventResponse]
    total: int
