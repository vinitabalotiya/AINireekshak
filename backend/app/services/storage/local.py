"""Local file storage service."""

import logging
import os
import shutil
import uuid
import zipfile
from pathlib import Path
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class LocalStorage:
    """Manages local filesystem storage for user uploads."""

    def __init__(self, base_path: str = "./uploads") -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file: UploadFile, directory: str = "") -> str:
        """Save an uploaded file asynchronously and return its absolute path."""
        target_dir = self.base_path / directory
        target_dir.mkdir(parents=True, exist_ok=True)

        original_name = file.filename or "unnamed_file"
        safe_name = f"{uuid.uuid4().hex[:8]}_{Path(original_name).name}"
        target_path = target_dir / safe_name

        content = await file.read()
        target_path.write_bytes(content)
        await file.seek(0)

        logger.info("Saved file to %s (%d bytes)", target_path, len(content))
        return str(target_path.resolve())

    def save_bytes(self, data: bytes, filename: str, directory: str = "") -> str:
        """Save raw bytes to a file and return absolute path."""
        target_dir = self.base_path / directory
        target_dir.mkdir(parents=True, exist_ok=True)

        safe_name = f"{uuid.uuid4().hex[:8]}_{Path(filename).name}"
        target_path = target_dir / safe_name
        target_path.write_bytes(data)

        logger.info("Saved bytes to %s (%d bytes)", target_path, len(data))
        return str(target_path.resolve())

    def get_file(self, path: str) -> bytes:
        """Read and return file bytes."""
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return file_path.read_bytes()

    def delete_file(self, path: str) -> bool:
        """Delete a file from disk."""
        try:
            file_path = Path(path)
            if file_path.exists():
                file_path.unlink()
                logger.info("Deleted file %s", path)
                return True
            return False
        except Exception as e:
            logger.error("Failed to delete file %s: %s", path, e)
            return False

    def safe_extract_zip(self, zip_path: str, extract_to: str | None = None) -> str:
        """Safely extract a ZIP file to prevent directory traversal and zip bombs."""
        zip_file_path = Path(zip_path)
        if not zip_file_path.exists():
            raise FileNotFoundError(f"Zip not found: {zip_path}")

        dest_dir = Path(extract_to) if extract_to else zip_file_path.parent / f"extracted_{zip_file_path.stem}"
        dest_dir.mkdir(parents=True, exist_ok=True)

        resolved_dest = dest_dir.resolve()
        total_size = 0
        max_total_size = 200 * 1024 * 1024  # 200 MB max extracted
        max_files = 2000

        with zipfile.ZipFile(zip_file_path, "r") as zf:
            infos = zf.infolist()
            if len(infos) > max_files:
                raise ValueError(f"Zip contains too many files ({len(infos)} > {max_files})")

            for info in infos:
                # Security: check for path traversal
                target_path = (dest_dir / info.filename).resolve()
                if not str(target_path).startswith(str(resolved_dest)):
                    raise ValueError(f"Illegal path in zip: {info.filename}")

                total_size += info.file_size
                if total_size > max_total_size:
                    raise ValueError("Extracted size exceeds limit (potential zip bomb)")

                zf.extract(info, dest_dir)

        logger.info("Extracted %d files to %s", len(infos), dest_dir)
        return str(dest_dir.resolve())
