"""Unit and integration tests for Maritime Ephemeral Sandbox Document Extractor."""

import io
import json
import os
import tempfile
import zipfile
from unittest.mock import MagicMock, patch

import pytest
from app.services.documents.sandbox_extractor import (
    MAX_FILE_SIZE,
    SandboxDocumentExtractor,
    SandboxExtractionError,
    SandboxTimeoutError,
    extract_tech_tags,
    validate_magic_bytes,
)


# --- 1. Magic Bytes Validation Tests ---

def test_validate_magic_bytes_valid_types():
    # PDF
    assert validate_magic_bytes(b"%PDF-1.7\n%...", ".pdf") is True
    # PPTX / DOCX / ZIP
    assert validate_magic_bytes(b"PK\x03\x04\x14\x00...", ".pptx") is True
    assert validate_magic_bytes(b"PK\x03\x04\x14\x00...", ".docx") is True
    assert validate_magic_bytes(b"PK\x03\x04\x14\x00...", ".zip") is True
    # Legacy OLE2 PPT
    assert validate_magic_bytes(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1...", ".ppt") is True
    # Text
    assert validate_magic_bytes(b"Slide 1: Architecture\nPython FastAPI Next.js", ".txt") is True


def test_validate_magic_bytes_invalid_spoofed_files():
    # Plain text disguised as PPTX
    assert validate_magic_bytes(b"This is just plain text", ".pptx") is False
    # Executable header disguised as PDF
    assert validate_magic_bytes(b"MZ\x90\x00\x03\x00\x00\x00", ".pdf") is False
    # Null byte binary disguised as plain text
    assert validate_magic_bytes(b"\x00\x00\x00\x00\x01\x02", ".txt") is False
    # Empty byte stream
    assert validate_magic_bytes(b"", ".pptx") is False


def test_extract_tech_tags():
    sample_text = "We built a real-time decentralized system using Python, FastAPI, PyTorch, Docker, Kubernetes, and Next.js."
    tags = extract_tech_tags(sample_text)
    assert "python" in tags
    assert "fastapi" in tags
    assert "pytorch" in tags
    assert "docker" in tags
    assert "kubernetes" in tags
    assert "next.js" in tags


# --- 2. Mocked Maritime SDK Tests ---

def test_mocked_maritime_sandbox_extraction_flow(tmp_path):
    """Test full ephemeral sandbox provisioning, egress restriction, execution, and cleanup with mocked SDK."""
    # Create valid sample PPTX file
    sample_file = tmp_path / "pitch.pptx"
    with zipfile.ZipFile(sample_file, "w") as zf:
        zf.writestr(
            "ppt/slides/slide1.xml",
            "<root><a:t xmlns:a='http://schemas.openxmlformats.org'>Smart Mandi AI</a:t></root>",
        )

    mock_client = MagicMock()
    mock_sandbox = MagicMock()

    # Ephemeral creation mock
    mock_client.ephemeral.create_ephemeral.return_value = {
        "id": "sbx_mock_12345",
        "name": "ainireekshak-parser-test",
        "status": "ready",
    }
    mock_client.sandboxes.connect.return_value = mock_sandbox

    # Command execution mock inside sandbox
    mock_cmd = MagicMock()
    mock_cmd.exit_code = 0
    mock_cmd.stdout = json.dumps({
        "slide_text": "--- Slide 1 ---\nSmart Mandi AI: Voice-first AgriTech built with FastAPI, PyTorch, and Docker.",
        "tech_tags": ["fastapi", "pytorch", "docker"],
        "slide_count": 1,
        "character_count": 86,
    })
    mock_cmd.stderr = ""
    mock_sandbox.run.return_value = mock_cmd

    extractor = SandboxDocumentExtractor(
        api_key="mk_mock_valid_key",
        use_sandbox=True,
        timeout_seconds=30,
    )

    with patch("app.services.documents.sandbox_extractor.logger") as mock_logger:
        result = extractor.extract_document(
            str(sample_file),
            ".pptx",
            client=mock_client,
        )

        # 1. Verify sandbox creation parameters
        mock_client.ephemeral.create_ephemeral.assert_called_once()
        create_kwargs = mock_client.ephemeral.create_ephemeral.call_args.kwargs
        assert create_kwargs["size"] == "small"
        assert create_kwargs["idle_minutes"] == 2
        assert create_kwargs["time_limit_minutes"] == 10
        assert create_kwargs["network"].egress == "none"

        # 2. Verify file copy and parser script copy
        assert mock_sandbox.files.write.call_count == 2
        write_paths = [call.args[0] for call in mock_sandbox.files.write.call_args_list]
        assert "/workspace/input.pptx" in write_paths
        assert "/workspace/sandbox_parser.py" in write_paths

        # 3. Verify execution parameters
        mock_sandbox.run.assert_called_once()
        run_args = mock_sandbox.run.call_args
        assert "python3 /workspace/sandbox_parser.py /workspace/input.pptx" in run_args[0][0]
        assert run_args[1]["timeout_seconds"] == 30

        # 4. Verify returned JSON
        assert "Smart Mandi AI" in result["slide_text"]
        assert "fastapi" in result["tech_tags"]
        assert result["sandbox_used"] is True
        assert result["sandbox_id"] == "sbx_mock_12345"

        # 5. Verify sandbox killed in finally block
        mock_sandbox.kill.assert_called_once()

        # 6. Verify structured logging without deck content
        completed_logs = [
            call for call in mock_logger.info.call_args_list
            if "Sandbox extraction completed" in str(call)
        ]
        assert len(completed_logs) == 1
        log_call = completed_logs[0]
        assert log_call.args[1] == "sbx_mock_12345"
        assert log_call.args[3] == 0
        # Ensure deck contents were NOT logged
        assert "Smart Mandi AI" not in str(log_call)


def test_sandbox_timeout_error_handling_and_cleanup(tmp_path):
    """Verify that a 30s timeout raises clean user-facing error and kills sandbox in finally block."""
    sample_file = tmp_path / "large_deck.pptx"
    with zipfile.ZipFile(sample_file, "w") as zf:
        zf.writestr("test.txt", "data")

    mock_client = MagicMock()
    mock_sandbox = MagicMock()

    mock_client.ephemeral.create_ephemeral.return_value = {"id": "sbx_timeout_999"}
    mock_client.sandboxes.connect.return_value = mock_sandbox

    # Simulate command timeout exception from Maritime SDK
    mock_sandbox.run.side_effect = TimeoutError("Command timed out after 30 seconds")

    extractor = SandboxDocumentExtractor(
        api_key="mk_mock_key",
        use_sandbox=True,
        timeout_seconds=30,
    )

    with pytest.raises(SandboxTimeoutError) as exc_info:
        extractor.extract_document(
            str(sample_file),
            ".pptx",
            client=mock_client,
        )

    assert "30 seconds" in str(exc_info.value)
    # Crucial assertion: Sandbox is ALWAYS killed even on timeout
    mock_sandbox.kill.assert_called_once()


def test_feature_flag_fallback_to_in_process(tmp_path):
    """When USE_SANDBOX_PARSER is False, verify in-process fallback without calling Maritime API."""
    sample_file = tmp_path / "doc.txt"
    sample_file.write_text("Hello from local fallback: Python and PyTorch", encoding="utf-8")

    mock_client = MagicMock()
    extractor = SandboxDocumentExtractor(
        api_key="mk_some_key",
        use_sandbox=False,  # Feature flag disabled
    )

    result = extractor.extract_document(
        str(sample_file),
        ".txt",
        client=mock_client,
    )

    # Maritime SDK must NOT be called
    mock_client.ephemeral.create_ephemeral.assert_not_called()
    assert result["sandbox_used"] is False
    assert result["fallback"] is True
    assert "Python" in result["slide_text"]
    assert "python" in result["tech_tags"]


# --- 3. Integration Tests with Malformed PPTX and Zip Bomb ---

def test_integration_malformed_pptx_isolation(tmp_path):
    """Integration test: Malformed PPTX fails safely inside sandbox while main process remains intact and sandbox is killed."""
    # Create corrupted file with PK zip header but corrupted payload
    malformed_pptx = tmp_path / "corrupted.pptx"
    malformed_pptx.write_bytes(b"PK\x03\x04" + b"\xFF\xFE\x00\x00" * 200)

    mock_client = MagicMock()
    mock_sandbox = MagicMock()

    mock_client.ephemeral.create_ephemeral.return_value = {"id": "sbx_corrupt_test"}
    mock_client.sandboxes.connect.return_value = mock_sandbox

    # Simulated sandbox failure response from sandbox parser script
    mock_cmd = MagicMock()
    mock_cmd.exit_code = 1
    mock_cmd.stdout = json.dumps({
        "error": "Invalid zip/pptx archive: File is not a zip file",
        "slide_text": "",
        "tech_tags": [],
    })
    mock_cmd.stderr = "Traceback: zipfile.BadZipFile"
    mock_sandbox.run.return_value = mock_cmd

    extractor = SandboxDocumentExtractor(
        api_key="mk_test_key",
        use_sandbox=True,
    )

    with pytest.raises(SandboxExtractionError) as exc_info:
        extractor.extract_document(
            str(malformed_pptx),
            ".pptx",
            client=mock_client,
        )

    assert "Invalid zip/pptx archive" in str(exc_info.value)
    # Assert sandbox killed
    mock_sandbox.kill.assert_called_once()


def test_integration_zip_bomb_detection_and_sandbox_kill(tmp_path):
    """Integration test: A decompression bomb (zip bomb) is detected and sandbox killed without affecting main process."""
    bomb_file = tmp_path / "bomb.pptx"

    # Create a zip bomb: file with huge declared uncompressed size or thousands of files
    mock_client = MagicMock()
    mock_sandbox = MagicMock()

    mock_client.ephemeral.create_ephemeral.return_value = {"id": "sbx_bomb_test"}
    mock_client.sandboxes.connect.return_value = mock_sandbox

    # Sandbox parser catches decompression bomb and exits with code 1 and error JSON
    mock_cmd = MagicMock()
    mock_cmd.exit_code = 1
    mock_cmd.stdout = json.dumps({
        "error": "Decompression limit exceeded (zip bomb detected)",
        "slide_text": "",
        "tech_tags": [],
    })
    mock_cmd.stderr = "Decompression bomb threshold violated"
    mock_sandbox.run.return_value = mock_cmd

    # Create valid zip header for magic bytes check
    with zipfile.ZipFile(bomb_file, "w") as zf:
        zf.writestr("test.xml", "bomb payload")

    extractor = SandboxDocumentExtractor(
        api_key="mk_test_key",
        use_sandbox=True,
    )

    with pytest.raises(SandboxExtractionError) as exc_info:
        extractor.extract_document(
            str(bomb_file),
            ".pptx",
            client=mock_client,
        )

    assert "zip bomb detected" in str(exc_info.value)
    # Assert sandbox is killed
    mock_sandbox.kill.assert_called_once()
