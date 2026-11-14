"""Submission-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class SubmissionFileResponse(BaseModel):
    """Schema for a submission file."""

    id: int
    file_path: str
    file_type: str | None = None
    file_size: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    """Schema for submission response."""

    id: int
    team_id: int
    event_id: int
    submission_type: str
    file_path: str | None = None
    original_filename: str | None = None
    file_size: int | None = None
    github_url: str | None = None
    status: str
    extracted_text: str | None = None
    analysis_result: dict | None = None
    files: list[SubmissionFileResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionListResponse(BaseModel):
    """Schema for paginated submission list."""

    items: list[SubmissionResponse]
    total: int
