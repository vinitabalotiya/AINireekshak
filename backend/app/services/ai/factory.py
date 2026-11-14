"""Factory for creating the appropriate AI provider."""

from app.core.config import settings
from app.services.ai.provider import AIProvider


def get_ai_provider() -> AIProvider:
    """Return the best available AI provider.

    Uses GeminiProvider if GEMINI_API_KEY is configured,
    otherwise falls back to DemoProvider.
    """
    if settings.GEMINI_API_KEY:
        from app.services.ai.gemini_provider import GeminiProvider
        return GeminiProvider()

    from app.services.ai.demo_provider import DemoProvider
    return DemoProvider()
