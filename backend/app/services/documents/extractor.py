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
        """Extract text from a PPTX file using python-pptx."""
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
                slides_text.append("\n".join(slide_content))
            result = "\n\n".join(slides_text)
            logger.info("Extracted %d characters from PPTX: %s", len(result), file_path)
            return result
        except Exception as e:
            logger.error("Failed to extract PPTX %s: %s", file_path, e)
            return f"[Error extracting PPTX: {e}]"

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
