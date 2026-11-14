"""Submission upload and analysis routes."""

import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.submission import Submission, SubmissionFile
from app.schemas.submission import SubmissionListResponse, SubmissionResponse
from app.services.ai.factory import get_ai_provider
from app.services.documents.extractor import DocumentExtractor
from app.services.storage.local import LocalStorage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

_storage = LocalStorage(base_path=settings.STORAGE_PATH)
_extractor = DocumentExtractor()

ALLOWED_TYPES = {
    ".pdf", ".pptx", ".ppt", ".docx", ".doc",
    ".zip", ".tar", ".gz",
    ".txt", ".md", ".py", ".js", ".ts", ".java", ".cpp", ".c", ".go", ".rs",
}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post("/upload", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def upload_submission(
    team_id: int = Form(...),
    event_id: int = Form(...),
    submission_type: str = Form(...),
    github_url: str | None = Form(None),
    file: UploadFile | None = File(None),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Upload a file submission or submit a GitHub URL."""
    if submission_type == "github":
        if not github_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub URL is required for github submission type",
            )
        submission = Submission(
            team_id=team_id,
            event_id=event_id,
            submission_type=submission_type,
            github_url=github_url,
            status="uploaded",
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)
        return SubmissionResponse.model_validate(submission)

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is required for non-github submission types",
        )

    # Validate file
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not allowed",
        )

    # Save file
    directory = f"team_{team_id}/event_{event_id}"
    saved_path = await _storage.save_file(file, directory)
    file_size = os.path.getsize(saved_path) if os.path.exists(saved_path) else 0

    if file_size > MAX_FILE_SIZE:
        os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    submission = Submission(
        team_id=team_id,
        event_id=event_id,
        submission_type=submission_type,
        file_path=saved_path,
        original_filename=filename,
        file_size=file_size,
        status="uploaded",
    )
    db.add(submission)
    await db.flush()

    # Create SubmissionFile record
    sub_file = SubmissionFile(
        submission_id=submission.id,
        file_path=saved_path,
        file_type=ext,
        file_size=file_size,
    )
    db.add(sub_file)

    await db.commit()
    await db.refresh(submission)

    logger.info("Submission uploaded: id=%d file=%s", submission.id, filename)
    return SubmissionResponse.model_validate(submission)


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Get a single submission by ID."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return SubmissionResponse.model_validate(submission)


@router.post("/{submission_id}/analyze", response_model=SubmissionResponse)
async def analyze_submission(
    submission_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Trigger AI analysis on a submission."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    submission.status = "processing"
    await db.commit()

    try:
        # Extract text
        extracted_text = ""
        if submission.file_path and os.path.exists(submission.file_path):
            ext = os.path.splitext(submission.file_path)[1].lower()
            extracted_text = _extractor.extract_by_type(submission.file_path, ext)
            submission.extracted_text = extracted_text

        # Run AI analysis
        provider = get_ai_provider()
        analysis = await provider.analyze_project(
            text=extracted_text or submission.github_url or "",
            context={
                "submission_type": submission.submission_type,
                "team_id": submission.team_id,
                "filename": submission.original_filename,
            },
        )

        submission.analysis_result = analysis
        submission.status = "analyzed"
    except Exception as e:
        logger.error("Analysis failed for submission %d: %s", submission_id, str(e))
        submission.status = "error"
        submission.analysis_result = {"error": str(e)}

    await db.commit()
    await db.refresh(submission)
    return SubmissionResponse.model_validate(submission)


@router.get("/team/{team_id}", response_model=SubmissionListResponse)
async def list_team_submissions(
    team_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionListResponse:
    """List all submissions for a team."""
    result = await db.execute(
        select(Submission).where(Submission.team_id == team_id).order_by(Submission.created_at.desc())
    )
    submissions = result.scalars().all()
    return SubmissionListResponse(
        items=[SubmissionResponse.model_validate(s) for s in submissions],
        total=len(submissions),
    )
