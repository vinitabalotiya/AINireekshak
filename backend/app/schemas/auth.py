"""Auth-related Pydantic schemas."""

from pydantic import BaseModel, EmailStr, Field


class AdminLogin(BaseModel):
    """Schema for admin login."""

    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)


class AdminCreate(BaseModel):
    """Schema for creating the first admin user."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)


class TeamLogin(BaseModel):
    """Schema for team login with access code."""

    team_name: str = Field(..., min_length=1, max_length=255)
    access_code: str = Field(..., min_length=1, max_length=50)
    event_id: int | None = Field(default=None, gt=0)


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str
