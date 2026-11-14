"""Unit tests for Multilingual Speech-to-Text and language detection."""

from app.services.speech.stt import SpeechRecognitionService


def test_english_language_detection():
    service = SpeechRecognitionService()
    res = service.process_transcription("We developed a decentralized machine learning system for precision agriculture.")
    assert res["language"] == "en"
    assert res["speaker"] == "participant"
    assert res["is_correction"] is False


def test_devanagari_hindi_detection():
    service = SpeechRecognitionService()
    res = service.process_transcription("हमने किसानों के लिए एक बहुभाषी वॉयस सहायक बनाया है।")
    assert res["language"] == "hi"
    assert "Hindi Transcript" in res["romanized_content"]


def test_hinglish_language_detection():
    service = SpeechRecognitionService()
    # Hinglish with mix of English technical terms and Hindi grammar/structure
    res = service.process_transcription("Humne yeh real-time system banaya hai jo crop prices predict karta hai.")
    assert res["language"] == "hinglish"


def test_transcript_correction():
    service = SpeechRecognitionService()
    original = "Humne React Native use kiya tha"
    corrected = "Humne Next.js 15 aur PyTorch use kiya tha"

    correction = service.apply_correction(original, corrected, corrected_by="participant")
    assert correction["original_content"] == original
    assert correction["corrected_content"] == corrected
    assert correction["is_correction"] is True
    assert correction["confidence"] == 1.0
