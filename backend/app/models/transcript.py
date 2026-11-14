"""Transcript and TranscriptCorrection ORM models."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Transcript(Base):
    """A single transcript segment from a judging session."""

    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    speaker: Mapped[str] = mapped_column(String(50), nullable=False)  # 'participant' or 'ai_judge'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    romanized_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Transcript id={self.id} speaker={self.speaker!r}>"


class TranscriptCorrection(Base):
    """Manual correction of a transcript segment."""

    __tablename__ = "transcript_corrections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transcript_id: Mapped[int] = mapped_column(Integer, ForeignKey("transcripts.id"), nullable=False, index=True)
    original_content: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_content: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self) -> str:
        return f"<TranscriptCorrection id={self.id}>"
