"""Multilingual speech-to-text service with Indian language and Hinglish support."""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class SpeechRecognitionService:
    """Handles multilingual speech transcription with support for English, Hindi, and Hinglish."""

    def __init__(self) -> None:
        self.supported_languages = ["en", "hi", "hinglish", "ta", "te", "bn", "mr"]

    def detect_language(self, text: str) -> str:
        """Detect language of text between English, Hindi (Devanagari), and Hinglish (Romanised Hindi)."""
        # Check Devanagari Unicode range: \u0900-\u097F
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
        total_letters = len(re.findall(r"[a-zA-Z\u0900-\u097F]", text))

        if total_letters == 0:
            return "en"

        if devanagari_count / total_letters > 0.3:
            return "hi"

        # Check for common Hinglish marker words
        hinglish_keywords = {
            "hum", "humne", "hamara", "aap", "karna", "kiya", "karenge",
            "yeh", "woh", "hai", "hain", "tha", "the", "bhi", "aur", "lekin",
            "kyunki", "kuch", "sabse", "accha", "bahut", "kaise", "kya", "toh",
            "banaya", "chahiye", "sakte", "chal", "raha", "wala", "wali"
        }
        words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        hinglish_matches = sum(1 for w in words if w in hinglish_keywords)

        if len(words) > 0 and (hinglish_matches / len(words)) >= 0.15:
            return "hinglish"

        return "en"

    def process_transcription(
        self,
        raw_text: str,
        speaker: str = "participant",
        confidence: float = 0.95,
    ) -> dict[str, Any]:
        """Process transcribed speech chunk, detect language, and prepare caption data."""
        clean_text = raw_text.strip()
        lang = self.detect_language(clean_text)

        # Romanized representation
        romanized = clean_text
        if lang == "hi":
            # In live production this maps via transliteration; here we preserve original Devanagari
            romanized = f"[Hindi Transcript] {clean_text}"

        return {
            "speaker": speaker,
            "content": clean_text,
            "language": lang,
            "romanized_content": romanized,
            "confidence": confidence,
            "is_correction": False,
        }

    def apply_correction(
        self,
        original_content: str,
        corrected_content: str,
        corrected_by: str = "participant",
    ) -> dict[str, Any]:
        """Apply manual or spoken correction to a prior transcript entry."""
        lang = self.detect_language(corrected_content)
        return {
            "original_content": original_content,
            "corrected_content": corrected_content.strip(),
            "corrected_by": corrected_by,
            "language": lang,
            "is_correction": True,
            "confidence": 1.0,  # Explicit participant correction has full confidence
        }
