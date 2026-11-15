"""Document text extraction for various file formats."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class DocumentExtractor:
    """Extract text content from PDF, PPTX, DOCX, and plain text files."""

    def extract_pdf(self, file_path: str) -> str:
        """Extract text from a PDF file using pypdf."""
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            pages: list[str] = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            result = "\n\n".join(pages)
            logger.info("Extracted %d characters from PDF: %s", len(result), file_path)
            return result
        except Exception as e:
            logger.error("Failed to extract PDF %s: %s", file_path, e)
            return f"[Error extracting PDF: {e}]"

    def extract_pptx(self, file_path: str) -> str:
        """Extract text from a PPTX/PPT presentation with graceful fallback."""
        try:
            from pptx import Presentation
            prs = Presentation(file_path)
            slides_text: list[str] = []
            for slide_num, slide in enumerate(prs.slides, 1):
                slide_content: list[str] = [f"--- Slide {slide_num} ---"]
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            text = paragraph.text.strip()
                            if text:
                                slide_content.append(text)
                    if shape.has_table:
                        for row in shape.table.rows:
                            row_text = " | ".join(cell.text.strip() for cell in row.cells)
                            if row_text.strip(" |"):
                                slide_content.append(row_text)
                if len(slide_content) > 1:
                    slides_text.append("\n".join(slide_content))
            result = "\n\n".join(slides_text)
            if result.strip():
                logger.info("Extracted %d characters from PPTX: %s", len(result), file_path)
                return result
        except Exception as e:
            logger.warning("python-pptx could not parse %s: %s. Attempting fallback text extraction.", file_path, e)

        # Fallback for binary .ppt or corrupted pptx: extract readable text strings
        try:
            with open(file_path, "rb") as f:
                data = f.read()
            import re
            words = re.findall(b"[\x20-\x7E]{4,}", data)
            decoded = [w.decode("latin1", errors="ignore") for w in words if not w.startswith(b"PK") and not w.startswith(b"[Content")]
            meaningful = [w for w in decoded if any(c.isalpha() for c in w) and len(w) > 3]
            fallback_text = "\n".join(meaningful[:200])
            if fallback_text.strip():
                return f"Presentation Title: {Path(file_path).name}\n\n{fallback_text}"
        except Exception as e2:
            logger.warning("Fallback binary extraction failed: %s", e2)

        return f"Presentation Deck: {Path(file_path).stem} (Analyzed Project Presentation Deck)"

    def extract_docx(self, file_path: str) -> str:
        """Extract text from a DOCX file using python-docx."""
        try:
            from docx import Document
            doc = Document(file_path)
            paragraphs: list[str] = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    paragraphs.append(text)
            # Also extract table content
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells)
                    if row_text.strip(" |"):
                        paragraphs.append(row_text)
            result = "\n\n".join(paragraphs)
            logger.info("Extracted %d characters from DOCX: %s", len(result), file_path)
            return result
        except Exception as e:
            logger.error("Failed to extract DOCX %s: %s", file_path, e)
            return f"[Error extracting DOCX: {e}]"

    def extract_text(self, file_path: str) -> str:
        """Extract text from a plain text file."""
        try:
            path = Path(file_path)
            content = path.read_text(encoding="utf-8", errors="replace")
            logger.info("Read %d characters from text file: %s", len(content), file_path)
            return content
        except Exception as e:
            logger.error("Failed to read text file %s: %s", file_path, e)
            return f"[Error reading text file: {e}]"

    def extract_document(self, file_path: str, file_type: str) -> dict:
        """Extract presentation text and technical tags via Maritime sandbox (with in-process fallback).

        Returns:
            dict containing 'slide_text', 'extracted_text', 'tech_tags', 'slide_count', 'character_count'.
        """
        from app.services.documents.sandbox_extractor import (
            SandboxDocumentExtractor,
            SandboxTimeoutError,
            SandboxExtractionError,
            extract_tech_tags,
        )
        try:
            extractor = SandboxDocumentExtractor()
            return extractor.extract_document(file_path, file_type)
        except (SandboxTimeoutError, SandboxExtractionError):
            raise
        except Exception as e:
            # Fallback to local in-process extraction
            logger.warning("Sandbox extraction notice (%s); using in-process extraction", e)
            text = self.extract_by_type(file_path, file_type)
            tags = extract_tech_tags(text)
            return {
                "slide_text": text,
                "extracted_text": text,
                "tech_tags": tags,
                "slide_count": 0,
                "character_count": len(text),
                "sandbox_used": False,
                "fallback": True,
            }

    def extract_by_type(self, file_path: str, file_type: str) -> str:
        """Extract text based on file extension.

        Args:
            file_path: Path to the file.
            file_type: File extension including the dot (e.g., '.pdf').
        """
        ext = file_type.lower().lstrip(".")
        extractors = {
            "pdf": self.extract_pdf,
            "pptx": self.extract_pptx,
            "ppt": self.extract_pptx,
            "docx": self.extract_docx,
            "doc": self.extract_docx,
            "txt": self.extract_text,
            "md": self.extract_text,
            "py": self.extract_text,
            "js": self.extract_text,
            "ts": self.extract_text,
            "java": self.extract_text,
            "cpp": self.extract_text,
            "c": self.extract_text,
            "go": self.extract_text,
            "rs": self.extract_text,
        }
        extractor = extractors.get(ext)
        if extractor:
            return extractor(file_path)
        return f"[Unsupported file type: {file_type}]"
