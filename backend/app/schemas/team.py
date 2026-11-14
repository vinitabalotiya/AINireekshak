"""Team-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TeamMemberCreate(BaseModel):
    """Schema for adding a team member."""

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr | None = None
    role: str | None = None


class TeamCreate(BaseModel):
    """Schema for creating a team."""

    event_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=255)
    project_name: str | None = None
    project_description: str | None = None
    members: list[TeamMemberCreate] = Field(default_factory=list)


class TeamUpdate(BaseModel):
    """Schema for updating a team."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    project_name: str | None = None
    project_description: str | None = None
    is_active: bool | None = None


class TeamMemberResponse(BaseModel):
    """Schema for team member response."""

    id: int
    name: str
    email: str | None = None
    role: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    """Schema for team response."""

    id: int
    event_id: int
    name: str
    project_name: str | None = None
    project_description: str | None = None
    members_count: int
    is_active: bool
    members: list[TeamMemberResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeamListResponse(BaseModel):
    """Schema for paginated team list."""

    items: list[TeamResponse]
    total: int


class TeamAccessCodeResponse(BaseModel):
    """Response returned when a team is created or access code is regenerated."""

    team: TeamResponse
    access_code: str = Field(..., description="Plain text access code. Shown only once.")


class TeamImportRow(BaseModel):
    """A single row from a CSV import."""

    team_name: str
    project_name: str | None = None
    members: list[TeamMemberCreate] = Field(default_factory=list)
