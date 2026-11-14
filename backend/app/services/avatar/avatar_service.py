"""Synthetic humanoid AI judge avatar service with state management."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class AvatarService:
    """Manages AI judge avatar conversational states and audio/TTS dispatch."""

    VALID_STATES = {"idle", "listening", "thinking", "speaking"}

    def __init__(self) -> None:
        self.current_state = "idle"

    def transition_state(self, new_state: str) -> dict[str, Any]:
        """Transition avatar animation and interaction state."""
        if new_state not in self.VALID_STATES:
            raise ValueError(f"Invalid avatar state: {new_state}. Valid states: {self.VALID_STATES}")

        previous_state = self.current_state
        self.current_state = new_state
        logger.debug("Avatar state transitioned: %s -> %s", previous_state, new_state)

        return {
            "type": "avatar_state",
            "previous_state": previous_state,
            "current_state": new_state,
        }

    def create_speech_response(
        self,
        question_or_comment: str,
        language: str = "en",
    ) -> dict[str, Any]:
        """Generate response packet for AI judge avatar speech."""
        return {
            "type": "avatar_speech",
            "text": question_or_comment,
            "language": language,
            "avatar_state": "speaking",
            # Audio synthesis parameters or fallback browser TTS directive
            "voice_config": {
                "engine": "browser_native_or_livekit",
                "pitch": 1.0,
                "rate": 1.0,
                "preferred_lang": "hi-IN" if language in ("hi", "hinglish") else "en-US",
            },
        }
