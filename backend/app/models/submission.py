"""Submission and SubmissionFile ORM models."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Submission(Base):
    """A file or link submission from a team."""

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    submission_type: Mapped[str] = mapped_column(
        SAEnum("presentation", "code", "document", "github", name="submission_type"),
        nullable=False,
    )
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("uploaded", "processing", "analyzed", "error", name="submission_status"),
        default="uploaded",
        nullable=False,
    )
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    files = relationship("SubmissionFile", back_populates="submission", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Submission id={self.id} type={self.submission_type!r}>"


class SubmissionFile(Base):
    """Individual file belonging to a submission."""

    __tablename__ = "submission_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    submission = relationship("Submission", back_populates="files", lazy="selectin")

    def __repr__(self) -> str:
        return f"<SubmissionFile id={self.id} type={self.file_type!r}>"
