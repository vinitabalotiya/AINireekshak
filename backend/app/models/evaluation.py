"""Evaluation, EvaluationCategory, and AuditLog ORM models."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Evaluation(Base):
    """Overall evaluation for a team's judging session."""

    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    total_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "in_progress", "completed", name="evaluation_status"),
        default="pending",
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    categories = relationship(
        "EvaluationCategory", back_populates="evaluation", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Evaluation id={self.id} score={self.total_score}>"


class EvaluationCategory(Base):
    """Individual scoring category within an evaluation."""

    __tablename__ = "evaluation_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluation_id: Mapped[int] = mapped_column(Integer, ForeignKey("evaluations.id"), nullable=False, index=True)
    category_name: Mapped[str] = mapped_column(String(100), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_references: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    evaluation = relationship("Evaluation", back_populates="categories", lazy="selectin")

    def __repr__(self) -> str:
        return f"<EvaluationCategory id={self.id} name={self.category_name!r} score={self.score}>"


class AuditLog(Base):
    """Audit log for tracking actions across the system."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'admin', 'team', 'system'
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r}>"
