"""Evaluation-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class EvaluationCategoryResponse(BaseModel):
    """Schema for an individual scoring category."""

    id: int
    category_name: str
    weight: float
    score: float | None = None
    max_score: float = 100.0
    justification: str | None = None
    evidence_references: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvaluationResponse(BaseModel):
    """Schema for a complete evaluation."""

    id: int
    session_id: int
    team_id: int
    event_id: int
    total_score: float | None = None
    status: str
    summary: str | None = None
    categories: list[EvaluationCategoryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvaluationReportResponse(BaseModel):
    """Schema for a full evaluation report with team context."""

    evaluation: EvaluationResponse
    team_name: str
    project_name: str | None = None


class RankingResponse(BaseModel):
    """Schema for a single entry in the rankings."""

    rank: int
    team_id: int
    team_name: str
    project_name: str | None = None
    total_score: float
    category_scores: dict[str, float] = {}
    is_shortlisted: bool = False


class ScoringWeightUpdate(BaseModel):
    """Schema for updating scoring weights."""

    innovation: float = Field(default=20.0, ge=0, le=100)
    technical_complexity: float = Field(default=20.0, ge=0, le=100)
    feasibility: float = Field(default=15.0, ge=0, le=100)
    presentation: float = Field(default=15.0, ge=0, le=100)
    qa_responses: float = Field(default=15.0, ge=0, le=100)
    code_quality: float = Field(default=15.0, ge=0, le=100)
