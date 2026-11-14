"""Demo AI provider that returns realistic mock responses."""

import random

from app.services.ai.provider import AIProvider


class DemoProvider(AIProvider):
    """Returns realistic but clearly labeled demo/mock AI responses."""

    async def analyze_project(self, text: str, context: dict) -> dict:
        """Return a demo project analysis."""
        return {
            "mode": "[DEMO MODE]",
            "problem_statement": "[DEMO MODE] The project addresses the challenge of automating repetitive tasks in software development workflows.",
            "solution": "[DEMO MODE] An AI-powered assistant that integrates with existing CI/CD pipelines to identify bottlenecks and suggest optimizations.",
            "architecture": "[DEMO MODE] Microservices architecture with a React frontend, FastAPI backend, and PostgreSQL database. Uses Redis for caching and WebSockets for real-time updates.",
            "tech_stack": ["Python", "FastAPI", "React", "PostgreSQL", "Redis", "Docker"],
            "innovation": "[DEMO MODE] Novel use of LLMs to analyze build logs and predict pipeline failures before they occur.",
            "feasibility": "[DEMO MODE] High feasibility. Uses proven technologies with well-documented APIs. Could be deployed within 3-6 months.",
            "limitations": "[DEMO MODE] Requires significant training data for the ML model. May not generalize well across different CI/CD platforms initially.",
        }

    async def generate_questions(self, context: dict) -> list[str]:
        """Return demo judging questions."""
        questions = [
            "[DEMO MODE] Can you explain the core algorithm behind your solution and its time complexity?",
            "[DEMO MODE] How does your system handle edge cases and error scenarios?",
            "[DEMO MODE] What differentiates your approach from existing solutions in the market?",
            "[DEMO MODE] How would you scale this solution to handle 10x the current load?",
            "[DEMO MODE] What security measures have you implemented to protect user data?",
            "[DEMO MODE] Can you walk us through a typical user journey in your application?",
            "[DEMO MODE] What was the biggest technical challenge you faced and how did you overcome it?",
        ]
        return random.sample(questions, min(5, len(questions)))

    async def evaluate_response(self, question: str, answer: str, context: dict) -> dict:
        """Return a demo response evaluation."""
        score = random.randint(60, 95)
        return {
            "mode": "[DEMO MODE]",
            "score": score,
            "feedback": f"[DEMO MODE] The response demonstrates a {'strong' if score > 80 else 'moderate'} understanding of the topic.",
            "strengths": [
                "[DEMO MODE] Clear articulation of the technical approach",
                "[DEMO MODE] Good understanding of system design principles",
            ],
            "weaknesses": [
                "[DEMO MODE] Could provide more specific metrics and benchmarks",
                "[DEMO MODE] Should address potential failure modes more thoroughly",
            ],
        }

    async def generate_evaluation(self, session_data: dict) -> dict:
        """Return a demo full evaluation."""
        categories = {
            "innovation": {
                "score": random.randint(65, 95),
                "justification": "[DEMO MODE] The project shows creative thinking in applying AI to solve the identified problem.",
                "evidence": ["Novel approach to data processing", "Creative UI/UX design choices"],
            },
            "technical_complexity": {
                "score": random.randint(60, 90),
                "justification": "[DEMO MODE] Solid technical implementation with appropriate use of modern frameworks.",
                "evidence": ["Well-structured codebase", "Appropriate use of design patterns"],
            },
            "feasibility": {
                "score": random.randint(70, 95),
                "justification": "[DEMO MODE] The solution is practical and could be deployed with reasonable effort.",
                "evidence": ["Realistic technology choices", "Clear deployment strategy"],
            },
            "presentation": {
                "score": random.randint(65, 90),
                "justification": "[DEMO MODE] The team communicated their ideas effectively during the session.",
                "evidence": ["Clear problem statement", "Well-organized demo"],
            },
            "qa_responses": {
                "score": random.randint(60, 85),
                "justification": "[DEMO MODE] The team showed good understanding when answering follow-up questions.",
                "evidence": ["Thoughtful responses", "Acknowledged limitations honestly"],
            },
            "code_quality": {
                "score": random.randint(55, 90),
                "justification": "[DEMO MODE] The codebase follows reasonable practices with room for improvement.",
                "evidence": ["Consistent coding style", "Some test coverage present"],
            },
        }

        team_name = session_data.get("team_name", "Unknown Team")
        project_name = session_data.get("project_name", "Unknown Project")

        return {
            "mode": "[DEMO MODE]",
            "summary": (
                f"[DEMO MODE] Team '{team_name}' presented '{project_name}' which demonstrates a solid approach "
                f"to solving the identified problem. The solution shows good technical depth and creative thinking. "
                f"Areas for improvement include more comprehensive testing and edge case handling."
            ),
            "categories": categories,
        }
