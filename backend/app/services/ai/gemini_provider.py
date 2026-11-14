"""Google Gemini AI provider implementation."""

import json
import logging

from app.core.config import settings
from app.services.ai.provider import AIProvider

logger = logging.getLogger(__name__)


class GeminiProvider(AIProvider):
    """AI provider using Google Gemini (google-genai SDK)."""

    def __init__(self) -> None:
        self._api_key = settings.GEMINI_API_KEY
        self._client = None
        if self._api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
            except Exception as e:
                logger.warning("Failed to initialize Gemini client: %s", e)
                self._client = None

    def _is_available(self) -> bool:
        return self._client is not None

    async def _generate(self, prompt: str) -> str:
        """Generate content using Gemini."""
        if not self._is_available():
            return ""
        try:
            response = self._client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text or ""
        except Exception as e:
            logger.error("Gemini generation error: %s", e)
            raise

    def _parse_json_response(self, text: str) -> dict:
        """Extract JSON from a response that may contain markdown fences."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from Gemini response, returning raw text")
            return {"raw_response": text}

    async def analyze_project(self, text: str, context: dict) -> dict:
        """Analyze project content using Gemini."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_project(text, context)

        prompt = f"""Analyze the following project submission and return a JSON object with these keys:
- problem_statement: What problem does this project solve?
- solution: How does the project solve the problem?
- architecture: Describe the system architecture.
- tech_stack: List of technologies used (as an array).
- innovation: What is innovative about this project?
- feasibility: How feasible is this project for real-world deployment?
- limitations: What are the limitations?

Context: {json.dumps(context)}

Project content:
{text[:8000]}

Return ONLY valid JSON, no other text."""

        raw = await self._generate(prompt)
        return self._parse_json_response(raw)

    async def generate_questions(self, context: dict) -> list[str]:
        """Generate judging questions using Gemini."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_questions(context)

        prompt = f"""You are an expert hackathon judge. Based on the following project context, generate 5 insightful
technical questions to ask the team during their judging session.

Project context:
{json.dumps(context)}

Return a JSON array of 5 question strings. Return ONLY valid JSON, no other text."""

        raw = await self._generate(prompt)
        parsed = self._parse_json_response(raw)
        if isinstance(parsed, list):
            return parsed
        if "raw_response" in parsed:
            return [parsed["raw_response"]]
        return list(parsed.values()) if parsed else []

    async def evaluate_response(self, question: str, answer: str, context: dict) -> dict:
        """Evaluate a participant's response using Gemini."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().evaluate_response(question, answer, context)

        prompt = f"""You are an expert hackathon judge evaluating a participant's response.

Question: {question}
Answer: {answer}
Context: {json.dumps(context)}

Return a JSON object with:
- score: integer 0-100
- feedback: string with detailed feedback
- strengths: array of strength points
- weaknesses: array of areas for improvement

Return ONLY valid JSON, no other text."""

        raw = await self._generate(prompt)
        return self._parse_json_response(raw)

    async def generate_evaluation(self, session_data: dict) -> dict:
        """Generate a full evaluation from session data using Gemini."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_evaluation(session_data)

        # Truncate data to fit context
        truncated = {
            "team_name": session_data.get("team_name"),
            "project_name": session_data.get("project_name"),
            "project_description": session_data.get("project_description"),
            "transcripts": session_data.get("transcripts", [])[:20],
            "submissions_count": len(session_data.get("submissions", [])),
        }
        # Include first submission analysis if available
        submissions = session_data.get("submissions", [])
        if submissions:
            truncated["first_submission_analysis"] = submissions[0].get("analysis_result")

        prompt = f"""You are an expert hackathon judge. Based on the following session data, generate a comprehensive
evaluation. Score each category from 0-100.

Session data:
{json.dumps(truncated, default=str)[:6000]}

Return a JSON object with:
- summary: Overall evaluation summary (2-3 paragraphs)
- categories: Object with keys: innovation, technical_complexity, feasibility, presentation, qa_responses, code_quality
  Each category should have: score (0-100), justification (string), evidence (array of strings)

Return ONLY valid JSON, no other text."""

        raw = await self._generate(prompt)
        return self._parse_json_response(raw)
