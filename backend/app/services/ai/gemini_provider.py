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
        """Generate content using Gemini with graceful fallback handling."""
        if not self._is_available():
            return ""
        try:
            response = self._client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text or ""
        except Exception as e:
            logger.warning("Gemini generation call failed: %s", e)
            return ""

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
        """Analyze project content using Gemini with automatic DemoProvider fallback."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_project(text, context)

        try:
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
            if raw:
                parsed = self._parse_json_response(raw)
                if isinstance(parsed, dict) and "problem_statement" in parsed:
                    return parsed

            # Fallback to demo provider if model returned empty or incomplete data
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_project(text, context)
        except Exception as e:
            logger.warning("Gemini analyze_project exception (%s), falling back to DemoProvider", e)
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_project(text, context)

    async def generate_questions(self, context: dict) -> list[str]:
        """Generate judging questions using Gemini with automatic DemoProvider fallback."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_questions(context)

        try:
            lang = context.get("language", "en")
            lang_instruction = (
                "Return questions in natural Devanagari Hindi." if lang == "hi"
                else "Return questions strictly in natural Roman script Hinglish (Hindi written using English alphabet)." if lang == "hinglish"
                else "Return questions in clear technical English."
            )

            prompt = f"""You are an expert technical hackathon judge.
Carefully inspect this team's presentation deck (PPT) analysis, extracted slide text, and pitch context.
Generate 5 sharp, insightful technical cross-examination questions that directly cite the claims, architecture, tech stack, and limitations in their PPT deck.

Language requirement: {lang_instruction}

Project & Presentation Deck Context:
{json.dumps(context, default=str)}

Return a JSON array of 5 question strings. Return ONLY valid JSON, no other text."""

            raw = await self._generate(prompt)
            if raw:
                parsed = self._parse_json_response(raw)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return parsed
                if isinstance(parsed, dict) and "raw_response" in parsed:
                    return [parsed["raw_response"]]
                if isinstance(parsed, dict) and parsed:
                    return list(parsed.values())

            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_questions(context)
        except Exception as e:
            logger.warning("Gemini generate_questions exception (%s), falling back to DemoProvider", e)
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_questions(context)

    async def evaluate_response(self, question: str, answer: str, context: dict) -> dict:
        """Evaluate a participant's response using Gemini with automatic DemoProvider fallback."""
        if not self._is_available():
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().evaluate_response(question, answer, context)

        try:
            prompt = f"""You are an expert hackathon judge evaluating a participant's response.

Question: {question}
Answer: {answer}
Context: {json.dumps(context, default=str)}

Return a JSON object with:
- score: integer 0-100
- feedback: string with detailed feedback
- strengths: array of strength points
- weaknesses: array of areas for improvement

Return ONLY valid JSON, no other text."""

            raw = await self._generate(prompt)
            if raw:
                parsed = self._parse_json_response(raw)
                if isinstance(parsed, dict) and "score" in parsed:
                    return parsed

            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().evaluate_response(question, answer, context)
        except Exception as e:
            logger.warning("Gemini evaluate_response exception (%s), falling back to DemoProvider", e)
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().evaluate_response(question, answer, context)

    async def generate_evaluation(self, session_data: dict) -> dict:
        """Generate a full evaluation scorecard using Gemini with fixed rubric JSON,
        temperature=0.0, and structured Pydantic schema validation.
        """
        from app.services.ai.gemini_scoring import GeminiScoringEngine
        scoring_engine = GeminiScoringEngine(api_key=self._api_key)
        scorecard = await scoring_engine.score_session(session_data)
        return scorecard.to_dict()
