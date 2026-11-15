"""Unit tests for Multilingual Speech-to-Text and language detection."""

from app.services.speech.stt import (
    SpeechRecognitionService,
    transliterate_to_hinglish,
    has_devanagari,
)


def test_english_language_detection():
    service = SpeechRecognitionService()
    res = service.process_transcription("We developed a decentralized machine learning system for precision agriculture.")
    assert res["language"] == "en"
    assert res["speaker"] == "participant"
    assert res["is_correction"] is False


def test_devanagari_hindi_detection():
    service = SpeechRecognitionService()
    res = service.process_transcription("हमने किसानों के लिए एक बहुभाषी वॉयस सहायक बनाया है।", target_mode="hi")
    assert res["language"] == "hi"
    assert has_devanagari(res["content"])
    assert not has_devanagari(res["romanized_content"])


def test_hinglish_language_detection():
    service = SpeechRecognitionService()
    res = service.process_transcription("Humne yeh real-time system banaya hai jo crop prices predict karta hai.")
    assert res["language"] == "hinglish"
    assert not has_devanagari(res["content"])


def test_hinglish_transliteration_no_devanagari_in_caption():
    """TASK 2 REQUIREMENT: In Hinglish mode, captions must ALWAYS be in Roman Latin script, never Devanagari."""
    service = SpeechRecognitionService()
    # Speech recognition engine produces Devanagari input when listening in hi-IN mode
    raw_stt_output = "हमारा प्रोजेक्ट एक AI बेस्ड प्लेटफॉर्म है"
    res = service.process_transcription(raw_stt_output, target_mode="hinglish")

    assert res["language"] == "hinglish"
    # Content displayed in caption box MUST NOT contain any Devanagari characters
    assert not has_devanagari(res["content"]), f"Devanagari found in Hinglish caption: {res['content']}"
    assert "project" in res["content"]
    assert "platform" in res["content"]
    assert "hai" in res["content"]


def test_transcript_correction():
    service = SpeechRecognitionService()
    original = "Humne React Native use kiya tha"
    corrected = "Humne Next.js 15 aur PyTorch use kiya tha"

    correction = service.apply_correction(original, corrected, corrected_by="participant")
    assert correction["original_content"] == original
    assert correction["corrected_content"] == corrected
    assert correction["is_correction"] is True
    assert correction["confidence"] == 1.0
