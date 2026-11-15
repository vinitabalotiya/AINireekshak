"""Event ORM model."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Event(Base):
    """A hackathon or judging event."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("draft", "active", "completed", name="event_status"),
        default="draft",
        nullable=False,
    )
    max_teams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scoring_weights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    liveness_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    behaviour_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
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
    teams = relationship("Team", back_populates="event", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Event id={self.id} name={self.name!r}>"
