"""Team and TeamMember ORM models."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Team(Base):
    """A participating team in an event."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    members_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    access_code_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    event = relationship("Event", back_populates="teams", lazy="selectin")
    members = relationship("TeamMember", back_populates="team", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Team id={self.id} name={self.name!r}>"


class TeamMember(Base):
    """An individual member of a team."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    team = relationship("Team", back_populates="members", lazy="selectin")

    def __repr__(self) -> str:
        return f"<TeamMember id={self.id} name={self.name!r}>"
