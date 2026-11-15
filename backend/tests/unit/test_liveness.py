"""Unit tests for Presence Verification Challenge scheduler and validation."""

import time
import pytest
from app.services.liveness.scheduler import LivenessService, CHALLENGE_TYPES


def test_schedule_generation_constraints():
    """Verify cryptographic schedule adheres to 2-3 count, >=45s gap, and window bounds."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=3)

    # 1. Strictly 2 to 3 challenges per 180s pitch
    assert len(schedule) in (2, 3)

    # 2. First challenge no earlier than 15s
    assert schedule[0]["scheduledAtSeconds"] >= 15

    # 3. Minimum 45s gap between challenges
    for i in range(1, len(schedule)):
        gap = schedule[i]["scheduledAtSeconds"] - schedule[i - 1]["scheduledAtSeconds"]
        assert gap >= 45, f"Gap between challenge {i-1} and {i} is {gap}s (< 45s)"

    # 4. Last no later than D - 15s (165s for 180s pitch)
    assert schedule[-1]["scheduledAtSeconds"] <= 180 - 15

    # 5. No consecutive duplicate challenges
    for i in range(1, len(schedule)):
        assert schedule[i]["type"] != schedule[i - 1]["type"], "Consecutive duplicate challenge found"

    # 6. At least one head turn challenge
    types = [c["type"] for c in schedule]
    has_head_turn = any("head" in t.lower() for t in types)
    assert has_head_turn, f"No head turn challenge in schedule: {types}"

    # 7. Unique nonces
    nonces = [c["nonce"] for c in schedule]
    assert len(nonces) == len(set(nonces)), "Duplicate nonce found in schedule"
    for n in nonces:
        assert len(n) == 32


def test_accessibility_flag_disables_challenges():
    """Verify settings flag enabled=False skips all challenge generation."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=3, enabled=False)
    assert schedule == [], "Disabled presence verification must return empty schedule"


def test_presence_verification_luminance_and_confidence():
    """Verify response extracts confidence and lighting-quality estimate (mean frame luminance)."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=2)
    target = schedule[0]

    dispatch_time = time.time() - 2.0
    client_response = {
        "challengeId": target["id"],
        "nonce": target["nonce"],
        "passed": True,
        "faceDetected": True,
        "confidence": 0.942,
        "meanLuminance": 142.5,
        "lightingQuality": "optimal",
        "responseTimeMs": 2000,
        "detected": target["type"],
    }

    result = service.validate_challenge_response(target, client_response, dispatch_time)
    assert result["valid"] is True
    assert result["status"] == "passed"
    assert result["confidence"] == 0.942
    assert result["meanLuminance"] == 142.5
    assert result["lightingQuality"] == "optimal"


def test_low_light_and_overexposed_luminance_classification():
    """Verify mean frame luminance triggers accurate lighting quality classification."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=2)
    target = schedule[0]

    # Low light test (< 60)
    res_low = service.validate_challenge_response(
        target,
        {
            "challengeId": target["id"],
            "nonce": target["nonce"],
            "passed": True,
            "faceDetected": True,
            "meanLuminance": 42.0,
        },
        time.time() - 1.0,
    )
    assert res_low["lightingQuality"] == "low_light"

    # Overexposed test (> 210)
    res_high = service.validate_challenge_response(
        target,
        {
            "challengeId": target["id"],
            "nonce": target["nonce"],
            "passed": True,
            "faceDetected": True,
            "meanLuminance": 225.0,
        },
        time.time() - 1.0,
    )
    assert res_high["lightingQuality"] == "overexposed"


def test_challenge_response_replay_nonce_mismatch():
    """Verify mismatched or replayed nonce is rejected."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=2)
    target = schedule[0]

    dispatch_time = time.time() - 2.0
    client_response = {
        "challengeId": target["id"],
        "nonce": "fake_or_replayed_nonce_1234567890",
        "passed": True,
        "faceDetected": True,
    }

    result = service.validate_challenge_response(target, client_response, dispatch_time)
    assert result["valid"] is False
    assert result["status"] == "failed"
    assert "nonce" in result["reason"].lower()


def test_challenge_response_timeout_grace_window():
    """Verify response arriving after 6.0s (5s + 1s grace) is marked missed."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=2)
    target = schedule[0]

    dispatch_time = time.time() - 6.5
    client_response = {
        "challengeId": target["id"],
        "nonce": target["nonce"],
        "passed": True,
        "faceDetected": True,
    }

    result = service.validate_challenge_response(target, client_response, dispatch_time)
    assert result["valid"] is False
    assert result["status"] == "missed"


def test_challenge_response_missing_face_fails():
    """Verify face must be detected at challenge pass for presence verification."""
    service = LivenessService()
    schedule = service.generate_session_schedule(duration_seconds=180, challenge_count=2)
    target = schedule[0]

    dispatch_time = time.time() - 2.0
    client_response = {
        "challengeId": target["id"],
        "nonce": target["nonce"],
        "passed": True,
        "faceDetected": False,  # Missing face
    }

    result = service.validate_challenge_response(target, client_response, dispatch_time)
    assert result["status"] == "failed"
    assert "face" in result["reason"].lower()
