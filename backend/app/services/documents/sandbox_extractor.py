"""Maritime Ephemeral Sandbox Document Extractor.

Isolates untrusted presentation deck (PPTX/PDF) text extraction and static analysis
inside a short-lived Maritime micro-VM sandbox with egress restricted to none.
"""

import json
import logging
import os
import re
import time
import uuid
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Maximum file size allowed for extraction: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Common technology keywords to tag extracted presentations
TECH_KEYWORDS = [
    "python", "fastapi", "django", "flask", "javascript", "typescript",
    "react", "next.js", "vue", "angular", "node.js", "docker", "kubernetes",
    "aws", "gcp", "azure", "pytorch", "tensorflow", "opencv", "yolo",
    "postgresql", "postgres", "mongodb", "redis", "sqlite", "graphql",
    "webrtc", "websocket", "blockchain", "solidity", "ethereum", "web3",
    "ai/ml", "machine learning", "deep learning", "nlp", "llm", "gemini",
    "rest api", "tailwind", "flutter", "react native", "rust", "golang",
    "microservices", "celery", "kafka", "ipfs", "mqtt", "onnx", "jwt",
]


class SandboxTimeoutError(Exception):
    """Raised when document extraction times out (>30s) inside the sandbox."""
    pass


class SandboxExtractionError(Exception):
    """Raised when document extraction fails inside the sandbox."""
    pass


def validate_magic_bytes(header: bytes, ext: str) -> bool:
    """Validate file content signature matches declared extension.

    Prevents disguised binaries, scripts, or corrupted files from being processed.
    """
    ext_lower = ext.lower().strip()
    if not ext_lower.startswith("."):
        ext_lower = f".{ext_lower}"

    if not header:
        return False

    # PDF format
    if ext_lower == ".pdf":
        return header.startswith(b"%PDF-")

    # Zip-based formats: PPTX, DOCX, ZIP
    if ext_lower in (".pptx", ".docx", ".zip"):
        return header.startswith(b"PK\x03\x04") or header.startswith(b"PK\x05\x06") or header.startswith(b"PK\x07\x08")

    # Microsoft Compound File Binary (OLE2): Legacy PPT, DOC
    if ext_lower in (".ppt", ".doc"):
        return header.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")

    # GZIP archive
    if ext_lower == ".gz":
        return header.startswith(b"\x1f\x8b")

    # TAR archive (check standard header)
    if ext_lower == ".tar":
        if len(header) >= 265:
            return header[257:262] in (b"ustar", b"\x00\x00\x00\x00\x00")
        return True

    # Plain text / source code formats
    if ext_lower in (".txt", ".md", ".py", ".js", ".ts", ".java", ".cpp", ".c", ".go", ".rs"):
        # Text files should not have null bytes in first 512 bytes
        if b"\x00\x00" in header:
            return False
        try:
            header.decode("utf-8")
            return True
        except UnicodeDecodeError:
            try:
                header.decode("latin-1")
                return True
            except UnicodeDecodeError:
                return False

    # Unknown extension
    return False


def extract_tech_tags(text: str) -> list[str]:
    """Scan extracted document text for recognized technical tags."""
    if not text:
        return []
    text_lower = text.lower()
    tags = set()
    for kw in TECH_KEYWORDS:
        if kw.isalnum():
            pattern = rf"\b{re.escape(kw)}\b"
        else:
            pattern = re.escape(kw)
        if re.search(pattern, text_lower):
            tags.add(kw)
    return sorted(list(tags))


# Standalone parser script executed inside the isolated Maritime micro-VM
SANDBOX_PARSER_SCRIPT = r"""
import sys
import os
import json
import re

TECH_KEYWORDS = [
    "python", "fastapi", "django", "flask", "javascript", "typescript",
    "react", "next.js", "vue", "angular", "node.js", "docker", "kubernetes",
    "aws", "gcp", "azure", "pytorch", "tensorflow", "opencv", "yolo",
    "postgresql", "postgres", "mongodb", "redis", "sqlite", "graphql",
    "webrtc", "websocket", "blockchain", "solidity", "ethereum", "web3",
    "ai/ml", "machine learning", "deep learning", "nlp", "llm", "gemini",
    "rest api", "tailwind", "flutter", "react native", "rust", "golang",
    "microservices", "celery", "kafka", "ipfs", "mqtt", "onnx", "jwt",
]

def extract_tech_tags(text):
    if not text:
        return []
    text_lower = text.lower()
    tags = set()
    for kw in TECH_KEYWORDS:
        if kw.isalnum():
            pat = r'\b' + re.escape(kw) + r'\b'
        else:
            pat = re.escape(kw)
        if re.search(pat, text_lower):
            tags.add(kw)
    return sorted(list(tags))

def parse_presentation(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    slide_text = ""
    slide_count = 0

    # Protection against decompression bombs (zip bombs)
    if ext in [".pptx", ".docx", ".zip"]:
        import zipfile
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                infos = zf.infolist()
                total_uncompressed = sum(info.file_size for info in infos)
                # Bomb thresholds: > 100 MB uncompressed or > 5,000 files
                if total_uncompressed > 100 * 1024 * 1024 or len(infos) > 5000:
                    return {
                        "error": "Decompression limit exceeded (zip bomb detected)",
                        "slide_text": "",
                        "tech_tags": [],
                        "slide_count": 0,
                        "character_count": 0,
                    }
        except Exception as ze:
            return {
                "error": f"Invalid zip/pptx archive: {ze}",
                "slide_text": "",
                "tech_tags": [],
                "slide_count": 0,
                "character_count": 0,
            }

    if ext in [".pptx", ".ppt"]:
        try:
            from pptx import Presentation
            prs = Presentation(file_path)
            slides_text = []
            for idx, slide in enumerate(prs.slides, 1):
                slide_count += 1
                content = [f"--- Slide {idx} ---"]
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for p in shape.text_frame.paragraphs:
                            t = p.text.strip()
                            if t:
                                content.append(t)
                    if shape.has_table:
                        for row in shape.table.rows:
                            rt = " | ".join(c.text.strip() for c in row.cells)
                            if rt.strip(" |"):
                                content.append(rt)
                if len(content) > 1:
                    slides_text.append("\n".join(content))
            slide_text = "\n\n".join(slides_text)
        except Exception as pe:
            # Fallback direct XML slide extraction from zip container
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                slides_text = []
                with zipfile.ZipFile(file_path, "r") as zf:
                    slide_files = sorted([n for n in zf.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")])
                    for idx, s_name in enumerate(slide_files, 1):
                        slide_count += 1
                        xml_bytes = zf.read(s_name)
                        root = ET.fromstring(xml_bytes)
                        texts = [elem.text for elem in root.iter() if elem.tag.endswith("}t") and elem.text]
                        if texts:
                            slides_text.append(f"--- Slide {idx} ---\n" + "\n".join(texts))
                if slides_text:
                    slide_text = "\n\n".join(slides_text)
            except Exception:
                pass

        if not slide_text.strip():
            # Binary string extraction fallback for legacy .ppt
            try:
                with open(file_path, "rb") as f:
                    data = f.read(5 * 1024 * 1024)
                words = re.findall(b"[\x20-\x7E]{4,}", data)
                decoded = [w.decode("latin1", errors="ignore") for w in words if not w.startswith(b"PK") and not w.startswith(b"[Content")]
                meaningful = [w for w in decoded if any(c.isalpha() for c in w) and len(w) > 3]
                slide_text = "\n".join(meaningful[:200])
            except Exception:
                slide_text = f"Presentation: {os.path.basename(file_path)}"

    elif ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            pages = []
            for p in reader.pages:
                slide_count += 1
                t = p.extract_text()
                if t:
                    pages.append(t)
            slide_text = "\n\n".join(pages)
        except Exception as fe:
            slide_text = f"[PDF extraction notice: {fe}]"

    elif ext in [".docx", ".doc"]:
        try:
            from docx import Document
            doc = Document(file_path)
            paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            slide_text = "\n\n".join(paras)
        except Exception as de:
            slide_text = f"[DOCX extraction notice: {de}]"

    else:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                slide_text = f.read(500000)
        except Exception as te:
            slide_text = f"[Text extraction notice: {te}]"

    tech_tags = extract_tech_tags(slide_text)
    return {
        "slide_text": slide_text,
        "tech_tags": tech_tags,
        "slide_count": slide_count,
        "character_count": len(slide_text),
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file argument provided", "slide_text": "", "tech_tags": []}))
        sys.exit(1)
    target = sys.argv[1]
    res = parse_presentation(target)
    print(json.dumps(res))
    sys.exit(0 if not res.get("error") else 1)
"""


class SandboxDocumentExtractor:
    """Manages isolated document extraction in Maritime Ephemeral Sandboxes with fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        use_sandbox: bool | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.MARITIME_API_KEY
        self.use_sandbox = use_sandbox if use_sandbox is not None else settings.USE_SANDBOX_PARSER
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else settings.SANDBOX_TIMEOUT_SECONDS

    def extract_document(
        self,
        file_path: str,
        file_type: str,
        client: Any | None = None,
    ) -> dict[str, Any]:
        """Extract document text and technical tags inside an ephemeral Maritime sandbox.

        Flow:
        1. Validate size and magic bytes.
        2. Check feature flag USE_SANDBOX_PARSER and API key.
        3. If sandbox disabled or unconfigured, fallback to in-process parser.
        4. Otherwise, provision ephemeral sandbox (small size, idleMinutes=2, timeLimitMinutes=10, network egress none).
        5. Copy file and parser script into sandbox.
        6. Execute parser script inside sandbox with 30s timeout.
        7. Return ONLY extracted JSON (slide text, tech tags).
        8. Kill sandbox in a finally block.
        9. Structured per-upload logs (sandbox id, duration, exit code; NO DECK CONTENT).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB")

        with open(file_path, "rb") as f:
            header = f.read(512)
            f.seek(0)
            file_bytes = f.read()

        # Validate magic bytes
        if not validate_magic_bytes(header, file_type):
            raise ValueError(f"Invalid file content: magic bytes signature does not match declared extension '{file_type}'")

        # Fallback check: Feature flag or missing API key
        if not self.use_sandbox or not self.api_key:
            logger.info(
                "Sandbox parser inactive (USE_SANDBOX_PARSER=%s, api_key_set=%s); using in-process parser",
                self.use_sandbox,
                bool(self.api_key),
            )
            return self._fallback_in_process_extraction(file_path, file_type)

        return self._extract_in_sandbox(file_path, file_type, file_bytes, client)

    def _extract_in_sandbox(
        self,
        file_path: str,
        file_type: str,
        file_bytes: bytes,
        client_override: Any | None = None,
    ) -> dict[str, Any]:
        """Execute extraction inside isolated Maritime Ephemeral Sandbox."""
        from maritime import Maritime, NetworkPolicy

        client = client_override or Maritime(api_key=self.api_key)
        start_time = time.time()
        sandbox_id = None
        sandbox = None
        exit_code = None

        try:
            # Create ephemeral sandbox with network egress restricted per Maritime docs
            network_policy = NetworkPolicy(egress="none")
            sandbox_name = f"ainireekshak-parser-{uuid.uuid4().hex[:8]}"

            box_data = client.ephemeral.create_ephemeral(
                name=sandbox_name,
                size="small",
                idle_minutes=2,
                time_limit_minutes=10,
                network=network_policy,
            )

            sandbox_id = box_data.get("id") or box_data.get("sandbox_id") or (box_data if isinstance(box_data, str) else None)
            if not sandbox_id:
                raise SandboxExtractionError("Failed to obtain sandbox ID from Maritime API response")

            # Connect to sandbox
            sandbox = client.sandboxes.connect(sandbox_id)

            # Copy file into sandbox
            ext = file_type.lower() if file_type.startswith(".") else f".{file_type.lower()}"
            remote_file = f"/workspace/input{ext}"
            sandbox.files.write(remote_file, file_bytes)

            # Copy parser script into sandbox
            sandbox.files.write("/workspace/sandbox_parser.py", SANDBOX_PARSER_SCRIPT)

            # Execute parser script inside sandbox with 30s timeout
            cmd = sandbox.run(
                f"python3 /workspace/sandbox_parser.py {remote_file}",
                timeout_seconds=self.timeout_seconds,
            )

            exit_code = getattr(cmd, "exit_code", 0)
            stdout = getattr(cmd, "stdout", "")
            stderr = getattr(cmd, "stderr", "")
            duration_ms = (time.time() - start_time) * 1000.0

            # Structured logging: sandbox id, duration, exit code (NO DECK CONTENT LOGGED)
            logger.info(
                "Sandbox extraction completed: sandbox_id=%s, duration_ms=%.1f, exit_code=%s",
                sandbox_id,
                duration_ms,
                exit_code,
            )

            if exit_code == 0:
                try:
                    result = json.loads(stdout)
                    slide_text = result.get("slide_text", "")
                    tech_tags = result.get("tech_tags", [])
                    return {
                        "slide_text": slide_text,
                        "extracted_text": slide_text,
                        "tech_tags": tech_tags,
                        "slide_count": result.get("slide_count", 0),
                        "character_count": result.get("character_count", len(slide_text)),
                        "sandbox_id": sandbox_id,
                        "sandbox_used": True,
                        "duration_ms": duration_ms,
                    }
                except json.JSONDecodeError as jde:
                    raise SandboxExtractionError(f"Sandbox parser returned invalid JSON: {jde}")
            else:
                # Check for explicit error JSON from parser (e.g. zip bomb detection)
                err_msg = "Unknown sandbox parsing error"
                try:
                    err_json = json.loads(stdout)
                    if "error" in err_json:
                        err_msg = err_json["error"]
                except Exception:
                    err_msg = stderr[:200] if stderr else f"Process exited with code {exit_code}"
                raise SandboxExtractionError(f"Sandbox parser failed (exit {exit_code}): {err_msg}")

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000.0
            error_type = type(e).__name__

            # Check if timeout occurred
            is_timeout = (
                isinstance(e, TimeoutError)
                or "timeout" in str(e).lower()
                or "timed out" in str(e).lower()
                or "command_timeout" in str(e).lower()
                or duration_ms >= (self.timeout_seconds * 1000.0)
            )

            if is_timeout:
                logger.error(
                    "Sandbox extraction timed out: sandbox_id=%s, duration_ms=%.1f, exit_code=TIMEOUT",
                    sandbox_id,
                    duration_ms,
                )
                raise SandboxTimeoutError(
                    "Document extraction timed out after 30 seconds in sandbox environment. Please verify your file or try again."
                ) from e

            logger.error(
                "Sandbox extraction failed: sandbox_id=%s, duration_ms=%.1f, exit_code=%s, error=%s",
                sandbox_id,
                duration_ms,
                exit_code,
                error_type,
            )

            # If it's a specific parsing error (like zip bomb), re-raise
            if isinstance(e, SandboxExtractionError):
                raise

            # If Maritime API authentication/connectivity error occurred, fallback gracefully to in-process
            logger.warning("Maritime SDK API error (%s); falling back to in-process parser for %s", e, file_path)
            fallback_res = self._fallback_in_process_extraction(file_path, file_type)
            fallback_res["sandbox_error"] = str(e)
            return fallback_res

        finally:
            # Kill sandbox in finally block
            if sandbox is not None:
                try:
                    sandbox.kill()
                    logger.debug("Killed sandbox %s via sandbox.kill()", sandbox_id)
                except Exception as k_err:
                    try:
                        client.ephemeral.kill_ephemeral(sandbox_id)
                        logger.debug("Killed sandbox %s via kill_ephemeral()", sandbox_id)
                    except Exception:
                        pass
            elif sandbox_id is not None:
                try:
                    client.ephemeral.kill_ephemeral(sandbox_id)
                    logger.debug("Killed sandbox %s via kill_ephemeral()", sandbox_id)
                except Exception:
                    pass

    def _fallback_in_process_extraction(self, file_path: str, file_type: str) -> dict[str, Any]:
        """In-process extraction fallback using local DocumentExtractor."""
        from app.services.documents.extractor import DocumentExtractor

        extractor = DocumentExtractor()
        text = extractor.extract_by_type(file_path, file_type)
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
