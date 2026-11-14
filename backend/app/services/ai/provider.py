"""Abstract base class for AI providers."""

from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Abstract AI provider that all concrete providers must implement."""

    @abstractmethod
    async def analyze_project(self, text: str, context: dict) -> dict:
        """Analyze project content and return structured analysis.

        Returns a dict with keys: problem_statement, solution, architecture,
        tech_stack, innovation, feasibility, limitations.
        """

    @abstractmethod
    async def generate_questions(self, context: dict) -> list[str]:
        """Generate judging questions based on project context.

        Args:
            context: Dict with project info (name, description, tech_stack, etc.)

        Returns:
            List of question strings.
        """

    @abstractmethod
    async def evaluate_response(self, question: str, answer: str, context: dict) -> dict:
        """Evaluate a participant's response to a question.

        Returns a dict with keys: score (0-100), feedback, strengths, weaknesses.
        """

    @abstractmethod
    async def generate_evaluation(self, session_data: dict) -> dict:
        """Generate a full evaluation from session data.

        Args:
            session_data: Dict with transcripts, submissions, team info.

        Returns:
            Dict with keys: summary, categories (dict of category -> {score, justification, evidence}).
        """
