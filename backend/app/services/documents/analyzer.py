"""Document analysis using AI providers."""

import logging

from app.services.ai.provider import AIProvider

logger = logging.getLogger(__name__)


class DocumentAnalyzer:
    """Analyze extracted document text using an AI provider."""

    def __init__(self, provider: AIProvider) -> None:
        self._provider = provider

    async def analyze(self, extracted_text: str, context: dict | None = None) -> dict:
        """Analyze extracted text and return structured analysis.

        Returns a dict with keys:
        - problem_statement
        - solution
        - architecture
        - tech_stack
        - innovation
        - feasibility
        - limitations
        """
        if not extracted_text or not extracted_text.strip():
            return {
                "problem_statement": "No content available for analysis.",
                "solution": "",
                "architecture": "",
                "tech_stack": [],
                "innovation": "",
                "feasibility": "",
                "limitations": "No document content was provided.",
            }

        analysis_context = context or {}
        analysis_context["content_length"] = len(extracted_text)

        try:
            result = await self._provider.analyze_project(
                text=extracted_text,
                context=analysis_context,
            )
            logger.info("Document analysis completed, keys: %s", list(result.keys()))
            return result
        except Exception as e:
            logger.error("Document analysis failed: %s", e)
            return {
                "problem_statement": f"Analysis failed: {e}",
                "solution": "",
                "architecture": "",
                "tech_stack": [],
                "innovation": "",
                "feasibility": "",
                "limitations": str(e),
                "error": True,
            }
