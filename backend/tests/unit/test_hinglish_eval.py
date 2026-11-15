"""Unit tests for the 50-sentence technical Hinglish transliteration and TTS evaluation."""

import os
import sys
from pathlib import Path

# Add project root to sys.path so scripts.evaluate_hinglish can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.speech.stt import transliterate_to_hinglish, has_devanagari
from app.services.speech.tts import prepare_tts_text
from scripts.evaluate_hinglish import TEST_SET, calculate_cer, normalize_spaces, run_benchmark


def test_hinglish_50_sentences_corpus_length():
    """Verify that the evaluation corpus contains 50 diverse technical Hinglish sentences."""
    assert len(TEST_SET) == 50
    domains = {item["domain"] for item in TEST_SET}
    assert len(domains) >= 8  # Covers major hackathon tech domains


def test_roundtrip_a_roman_to_deva_to_roman():
    """Verify Round-Trip A (Roman -> TTS Devanagari -> Transliterated Roman)."""
    exact_matches = 0
    total_cer = 0.0

    for item in TEST_SET:
        original_roman = item["roman"]
        tts_deva, _ = prepare_tts_text(original_roman, "hinglish")

        # Devanagari text synthesized for TTS must have Devanagari characters
        assert has_devanagari(tts_deva), f"Expected Devanagari in TTS text for: {original_roman}"

        roundtrip_roman = transliterate_to_hinglish(tts_deva)
        # Transliterated Roman must NEVER contain Devanagari
        assert not has_devanagari(roundtrip_roman), f"Devanagari found in roundtrip Roman: {roundtrip_roman}"

        norm_orig = normalize_spaces(original_roman)
        norm_rt = normalize_spaces(roundtrip_roman)

        if norm_orig == norm_rt:
            exact_matches += 1
        cer = calculate_cer(norm_orig, norm_rt)
        total_cer += cer

    em_rate = (exact_matches / len(TEST_SET)) * 100.0
    mean_cer = total_cer / len(TEST_SET)

    assert em_rate >= 98.0, f"Round-Trip A exact match rate {em_rate:.2f}% is below 98%"
    assert mean_cer <= 0.02, f"Round-Trip A mean CER {mean_cer:.4f} exceeds 0.02"


def test_roundtrip_b_deva_to_roman_to_deva():
    """Verify Round-Trip B (Devanagari -> Transliterated Roman -> TTS Devanagari)."""
    exact_matches = 0
    total_cer = 0.0

    for item in TEST_SET:
        original_deva = item["devanagari"]
        translit_roman = transliterate_to_hinglish(original_deva)

        # Transliterated text must be Roman without Devanagari
        assert not has_devanagari(translit_roman)

        roundtrip_deva, _ = prepare_tts_text(translit_roman, "hinglish")

        norm_orig = normalize_spaces(original_deva)
        norm_rt = normalize_spaces(roundtrip_deva)

        if norm_orig == norm_rt:
            exact_matches += 1
        cer = calculate_cer(norm_orig, norm_rt)
        total_cer += cer

    em_rate = (exact_matches / len(TEST_SET)) * 100.0
    mean_cer = total_cer / len(TEST_SET)

    assert em_rate >= 98.0, f"Round-Trip B exact match rate {em_rate:.2f}% is below 98%"
    assert mean_cer <= 0.02, f"Round-Trip B mean CER {mean_cer:.4f} exceeds 0.02"


def test_run_benchmark_returns_perfect_score():
    """Verify that run_benchmark execution returns 100% exact match and 0% CER."""
    result = run_benchmark()
    assert result["count"] == 50
    assert result["roundtrip_a"]["exact_match_rate"] == 100.0
    assert result["roundtrip_a"]["mean_cer"] == 0.0
    assert result["roundtrip_b"]["exact_match_rate"] == 100.0
    assert result["roundtrip_b"]["mean_cer"] == 0.0
    assert len(result["failures"]) == 0
