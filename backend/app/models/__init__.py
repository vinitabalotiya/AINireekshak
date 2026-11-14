"""Import all models so they register with Base.metadata."""

from app.models.admin import AdminUser  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.team import Team, TeamMember  # noqa: F401
from app.models.session import Session  # noqa: F401
from app.models.submission import Submission, SubmissionFile  # noqa: F401
from app.models.transcript import Transcript, TranscriptCorrection  # noqa: F401
from app.models.evaluation import Evaluation, EvaluationCategory, AuditLog  # noqa: F401

__all__ = [
    "AdminUser",
    "Event",
    "Team",
    "TeamMember",
    "Session",
    "Submission",
    "SubmissionFile",
    "Transcript",
    "TranscriptCorrection",
    "Evaluation",
    "EvaluationCategory",
    "AuditLog",
]
