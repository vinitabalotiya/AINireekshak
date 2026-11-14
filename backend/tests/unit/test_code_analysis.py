"""Unit tests for safe static code analysis."""

import io
import zipfile
from pathlib import Path
import pytest
from app.services.code_analysis.analyzer import CodeAnalyzer


def test_github_url_analysis():
    analyzer = CodeAnalyzer()
    res = analyzer.analyze_github("https://github.com/ainireekshak/smart-judge-core.git")
    assert res["owner"] == "ainireekshak"
    assert res["repo"] == "smart-judge-core"
    assert res["analysis_status"] == "metadata_verified"


def test_zip_safe_extraction_and_analysis(tmp_path: Path):
    # Create a small sample zip with python and javascript files
    zip_path = tmp_path / "submission.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("app/main.py", "import os\nprint('hello world')\n")
        zf.writestr("requirements.txt", "fastapi\nuvicorn\n")
        zf.writestr("frontend/index.js", "console.log('hi');\n")

    analyzer = CodeAnalyzer()
    res = analyzer.analyze_zip(str(zip_path))

    assert "error" not in res
    assert res["primary_language"] in ("Python", "JavaScript")
    assert "requirements.txt (Python (pip))" in res["manifests_found"]
    assert "main.py" in str(res["entry_points"])
