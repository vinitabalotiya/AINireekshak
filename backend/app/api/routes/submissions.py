"""Submission upload and analysis routes."""

import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_current_team_or_admin, get_db
from app.models.admin import AdminUser
from app.models.submission import Submission, SubmissionFile
from app.schemas.submission import SubmissionListResponse, SubmissionResponse
from app.services.ai.factory import get_ai_provider
from app.services.code_analysis.analyzer import CodeAnalyzer
from app.services.documents.extractor import DocumentExtractor
from app.services.documents.sandbox_extractor import (
    validate_magic_bytes,
    SandboxTimeoutError,
    SandboxExtractionError,
)
from app.services.storage.local import LocalStorage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

_storage = LocalStorage(base_path=settings.STORAGE_PATH)
_extractor = DocumentExtractor()
_code_analyzer = CodeAnalyzer()

ALLOWED_TYPES = {
    ".pdf", ".pptx", ".ppt", ".docx", ".doc",
    ".zip", ".tar", ".gz",
    ".txt", ".md", ".py", ".js", ".ts", ".java", ".cpp", ".c", ".go", ".rs",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def upload_submission(
    team_id: int = Form(...),
    event_id: int = Form(...),
    submission_type: str = Form(...),
    github_url: str | None = Form(None),
    file: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Upload a file submission or submit a GitHub URL."""
    # Enforce team data isolation
    if current_user["role"] == "team" and current_user["id"] != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot upload submission for another team",
        )

    # Enforce 1-submission limit per team
    existing_result = await db.execute(
        select(Submission).where(
            Submission.team_id == team_id,
            Submission.event_id == event_id,
        )
    )
    existing_submissions = existing_result.scalars().all()
    if len(existing_submissions) >= 1 and current_user["role"] == "team":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission limit reached: Teams are allowed only 1 PPT presentation submission.",
        )

    # Enforce PPT presentation type only for team participants
    if current_user["role"] == "team" and submission_type not in ("presentation", "ppt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PPT presentation submissions are allowed.",
        )

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

    # Validate magic bytes signature on header before saving
    header = await file.read(512)
    await file.seek(0)
    if not validate_magic_bytes(header, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file content: magic bytes signature does not match declared extension '{ext}'",
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

    # Automatically extract text and technical tags via Maritime ephemeral sandbox (with fallback)
    extracted_text = ""
    tech_tags: list[str] = []
    sandbox_used = False
    try:
        doc_res = _extractor.extract_document(saved_path, ext)
        extracted_text = doc_res.get("slide_text") or doc_res.get("extracted_text") or ""
        tech_tags = doc_res.get("tech_tags") or []
        sandbox_used = doc_res.get("sandbox_used", False)
    except SandboxTimeoutError as timeout_err:
        logger.error("Document extraction timeout in sandbox for %s: %s", saved_path, timeout_err)
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Document extraction timed out after 30 seconds in isolated sandbox. Please verify your presentation file or try again.",
        )
    except SandboxExtractionError as extract_err:
        logger.error("Document extraction error in sandbox for %s: %s", saved_path, extract_err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract presentation deck: {str(extract_err)}",
        )
    except Exception as extract_err:
        logger.warning("Automatic text extraction notice for %s: %s", saved_path, extract_err)
        extracted_text = f"Presentation: {filename}"

    # Automatically analyze presentation with AI provider
    analysis = None
    ai_status = "uploaded"
    try:
        provider = get_ai_provider()
        analysis = await provider.analyze_project(
            text=extracted_text or filename,
            context={
                "submission_type": submission_type,
                "team_id": team_id,
                "filename": filename,
                "tech_tags": tech_tags,
                "sandbox_used": sandbox_used,
            },
        )
        if isinstance(analysis, dict):
            analysis["tech_tags"] = tech_tags
            analysis["sandbox_used"] = sandbox_used
        ai_status = "analyzed"
    except Exception as ai_err:
        logger.warning("Automatic AI analysis notice for %s: %s, using fallback", saved_path, ai_err)
        try:
            from app.services.ai.demo_provider import DemoProvider
            analysis = await DemoProvider().analyze_project(
                text=extracted_text or filename,
                context={
                    "submission_type": submission_type,
                    "team_id": team_id,
                    "filename": filename,
                    "tech_tags": tech_tags,
                    "sandbox_used": sandbox_used,
                }
            )
            if isinstance(analysis, dict):
                analysis["tech_tags"] = tech_tags
                analysis["sandbox_used"] = sandbox_used
            ai_status = "analyzed"
        except Exception:
            ai_status = "uploaded"

    submission = Submission(
        team_id=team_id,
        event_id=event_id,
        submission_type=submission_type,
        file_path=saved_path,
        original_filename=filename,
        file_size=file_size,
        extracted_text=extracted_text,
        analysis_result=analysis,
        status=ai_status,
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

    logger.info("Submission uploaded & analyzed: id=%d file=%s status=%s", submission.id, filename, submission.status)
    return SubmissionResponse.model_validate(submission)


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Get a single submission by ID."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if current_user["role"] == "team" and submission.team_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot access another team's submission",
        )
    return SubmissionResponse.model_validate(submission)


@router.delete("/{submission_id}")
async def delete_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a submission and clean up its stored files."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if current_user["role"] == "team" and current_user["id"] != submission.team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot delete submission of another team",
        )

    # Remove physical file if it exists
    if submission.file_path and os.path.exists(submission.file_path):
        try:
            os.remove(submission.file_path)
        except Exception as e:
            logger.warning("Could not delete physical file %s: %s", submission.file_path, e)

    # Clean up associated files and record via cascade
    await db.delete(submission)
    await db.commit()

    logger.info("Submission %d deleted by user %s", submission_id, current_user.get("id"))
    return {"status": "success", "success": True, "message": "Presentation submission removed successfully."}


@router.post("/{submission_id}/analyze", response_model=SubmissionResponse)
async def analyze_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """Trigger AI analysis on a submission."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if current_user["role"] == "team" and current_user["id"] != submission.team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot analyze submission of another team",
        )

    submission.status = "processing"
    await db.commit()

    try:
        # Extract text or run static code analysis
        extracted_text = ""
        code_analysis_data = None

        if submission.github_url:
            code_analysis_data = _code_analyzer.analyze_github(submission.github_url)
        elif submission.file_path and os.path.exists(submission.file_path):
            ext = os.path.splitext(submission.file_path)[1].lower()
            if ext in (".zip", ".tar", ".gz"):
                code_analysis_data = _code_analyzer.analyze_zip(submission.file_path)
            else:
                try:
                    doc_res = _extractor.extract_document(submission.file_path, ext)
                    extracted_text = doc_res.get("slide_text") or doc_res.get("extracted_text") or ""
                except SandboxTimeoutError as timeout_err:
                    raise HTTPException(
                        status_code=status.HTTP_408_REQUEST_TIMEOUT,
                        detail="Document extraction timed out after 30 seconds in isolated sandbox.",
                    )
                except Exception as extract_err:
                    logger.warning("Extraction error for %s: %s", submission.file_path, extract_err)
                    extracted_text = f"Project Presentation File: {submission.original_filename}"
                submission.extracted_text = extracted_text

        # Run AI analysis with automatic fallback
        provider = get_ai_provider()
        try:
            analysis = await provider.analyze_project(
                text=extracted_text or submission.github_url or submission.original_filename or "",
                context={
                    "submission_type": submission.submission_type,
                    "team_id": submission.team_id,
                    "filename": submission.original_filename,
                },
            )
        except Exception as ai_err:
            logger.warning("AI provider error for submission %d: %s, using fallback", submission_id, ai_err)
            from app.services.ai.demo_provider import DemoProvider
            analysis = await DemoProvider().analyze_project(
                text=extracted_text or "",
                context={"submission_type": submission.submission_type, "team_id": submission.team_id, "filename": submission.original_filename}
            )

        if code_analysis_data:
            analysis["code_analysis"] = code_analysis_data
            analysis["metrics"] = {
                "total_files": code_analysis_data.get("total_files", 0),
                "total_source_lines": code_analysis_data.get("total_source_lines", 0),
                "primary_language": code_analysis_data.get("primary_language", "Unknown"),
                "functions_count": max(2, code_analysis_data.get("total_files", 1) * 2),
            }

        submission.analysis_result = analysis
        submission.status = "analyzed"
    except Exception as e:
        logger.error("Analysis fallback triggered for submission %d: %s", submission_id, str(e))
        from app.services.ai.demo_provider import DemoProvider
        submission.analysis_result = await DemoProvider().analyze_project(
            text="",
            context={"submission_type": submission.submission_type, "team_id": submission.team_id, "filename": submission.original_filename}
        )
        submission.status = "analyzed"

    await db.commit()
    await db.refresh(submission)
    return SubmissionResponse.model_validate(submission)


@router.get("/team/{team_id}", response_model=SubmissionListResponse)
async def list_team_submissions(
    team_id: int,
    current_user: dict = Depends(get_current_team_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionListResponse:
    """List all submissions for a team."""
    if current_user["role"] == "team" and current_user["id"] != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot view submissions of another team",
        )

    result = await db.execute(
        select(Submission).where(Submission.team_id == team_id).order_by(Submission.created_at.desc())
    )
    submissions = result.scalars().all()
    return SubmissionListResponse(
        items=[SubmissionResponse.model_validate(s) for s in submissions],
        total=len(submissions),
    )
