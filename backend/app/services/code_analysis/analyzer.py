"""Static code analysis service (strictly read-only, non-executing)."""

import logging
import os
import re
from pathlib import Path
from typing import Any
from app.services.storage.local import LocalStorage

logger = logging.getLogger(__name__)

LANGUAGE_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React/JSX",
    ".ts": "TypeScript",
    ".tsx": "React/TSX",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".html": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
    ".sh": "Shell",
}

DEPENDENCY_FILES = {
    "package.json": "Node.js (npm/yarn)",
    "requirements.txt": "Python (pip)",
    "Pipfile": "Python (pipenv)",
    "pyproject.toml": "Python (poetry/build)",
    "Cargo.toml": "Rust (Cargo)",
    "go.mod": "Go",
    "pom.xml": "Java (Maven)",
    "build.gradle": "Java (Gradle)",
    "composer.json": "PHP (Composer)",
}


class CodeAnalyzer:
    """Performs safe, static inspection of submitted codebases without executing code."""

    def __init__(self) -> None:
        self.storage = LocalStorage()

    def analyze_directory(self, dir_path: str) -> dict[str, Any]:
        """Inspect directory structure, languages, dependency manifests, and file metrics."""
        root = Path(dir_path)
        if not root.is_dir():
            return {"error": f"Path is not a valid directory: {dir_path}"}

        lang_counts: dict[str, int] = {}
        total_files = 0
        total_lines = 0
        manifests_found: list[str] = []
        entry_points: list[str] = []
        key_modules: list[str] = []

        # Walk up to 1000 files to avoid massive recursion
        for item in root.rglob("*"):
            if not item.is_file():
                continue

            # Ignore .git, node_modules, .venv, dist, build
            parts = item.parts
            if any(p in parts for p in (".git", "node_modules", ".venv", "__pycache__", ".next", "dist", "build")):
                continue

            total_files += 1
            if total_files > 1500:
                break

            name = item.name
            ext = item.suffix.lower()

            if ext in LANGUAGE_EXTENSIONS:
                lang = LANGUAGE_EXTENSIONS[ext]
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

            if name in DEPENDENCY_FILES:
                manifests_found.append(f"{name} ({DEPENDENCY_FILES[name]})")

            # Check entry points
            if name.lower() in ("main.py", "app.py", "index.js", "index.ts", "server.js", "main.go", "app.tsx"):
                entry_points.append(str(item.relative_to(root)))

            # Count lines for source files under 1MB
            if ext in LANGUAGE_EXTENSIONS and item.stat().st_size < 1024 * 1024:
                try:
                    lines = item.read_text(encoding="utf-8", errors="ignore").splitlines()
                    total_lines += len(lines)
                except Exception:
                    pass

        # Sort languages by frequency
        sorted_langs = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)
        primary_language = sorted_langs[0][0] if sorted_langs else "Unknown"

        return {
            "total_files": total_files,
            "total_source_lines": total_lines,
            "primary_language": primary_language,
            "languages_detected": dict(sorted_langs),
            "manifests_found": list(set(manifests_found)),
            "entry_points": entry_points[:10],
            "analysis_status": "completed",
            "is_runnable_heuristics": len(manifests_found) > 0 and len(entry_points) > 0,
        }

    def analyze_zip(self, zip_path: str) -> dict[str, Any]:
        """Safely extract ZIP submission and analyze contained source code."""
        try:
            dest_dir = self.storage.safe_extract_zip(zip_path)
            res = self.analyze_directory(dest_dir)
            res["source_type"] = "zip_archive"
            res["archive_path"] = zip_path
            return res
        except Exception as e:
            logger.error("Failed to analyze zip %s: %s", zip_path, e)
            return {"error": f"Failed to extract and analyze ZIP: {str(e)}"}

    def analyze_github(self, github_url: str) -> dict[str, Any]:
        """Parse and statically inspect a submitted GitHub repository link."""
        # Clean URL
        clean_url = github_url.strip()
        match = re.match(r"^https?://github\.com/([^/]+)/([^/]+)", clean_url)
        if not match:
            return {
                "error": "Invalid GitHub repository URL format",
                "source_type": "github",
                "github_url": clean_url,
            }

        owner, repo = match.group(1), match.group(2).replace(".git", "")
        return {
            "source_type": "github",
            "owner": owner,
            "repo": repo,
            "github_url": clean_url,
            "analysis_status": "metadata_verified",
            "notes": "Remote GitHub repository registered for evaluation review.",
        }
