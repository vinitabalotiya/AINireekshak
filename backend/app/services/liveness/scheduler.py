"""Presence verification challenge scheduler, cryptographic nonce generator, and verification service."""

import logging
import random
import secrets
import time
from typing import Any

logger = logging.getLogger(__name__)

CHALLENGE_TYPES = [
    "Open_Palm",
    "Thumb_Up",
    "Victory",
    "Turn head LEFT",
    "Turn head RIGHT",
]

CHALLENGE_I18N = {
    "Open_Palm": {
        "title": "Show your palm 🖐️",
        "en": "Presence verification: Please show your open palm to the camera.",
        "hi": "उपस्थिति सत्यापन: कृपया कैमरे के सामने अपनी खुली हथेली दिखाएं।",
        "hinglish": "Presence Verification: Camera ke samne apna open palm dikhayein.",
        "icon": "hand",
    },
    "Thumb_Up": {
        "title": "Thumbs up 👍",
        "en": "Presence verification: Give a thumbs up to the camera.",
        "hi": "उपस्थिति सत्यापन: कृपया कैमरे के सामने थम्स अप दिखाएं।",
        "hinglish": "Presence Verification: Camera ke samne thumbs up karein.",
        "icon": "thumbs-up",
    },
    "Victory": {
        "title": "Peace / Victory sign ✌️",
        "en": "Presence verification: Show a two-finger victory sign.",
        "hi": "उपस्थिति सत्यापन: कृपया दो उंगलियों से विक्ट्री साइन दिखाएं।",
        "hinglish": "Presence Verification: Do ungliyon se victory sign dikhayein.",
        "icon": "victory",
    },
    "Turn head LEFT": {
        "title": "Turn head LEFT ⬅️",
        "en": "Presence verification: Turn your head to the left, then look back.",
        "hi": "उपस्थिति सत्यापन: अपना सिर बाईं ओर घुमाएं और फिर सामने देखें।",
        "hinglish": "Presence Verification: Apna head left turn karein aur phir center dekhein.",
        "icon": "arrow-left",
    },
    "Turn head RIGHT": {
        "title": "Turn head RIGHT ➡️",
        "en": "Presence verification: Turn your head to the right, then look back.",
        "hi": "उपस्थिति सत्यापन: अपना सिर दाईं ओर घुमाएं और फिर सामने देखें।",
        "hinglish": "Presence Verification: Apna head right turn karein aur phir center dekhein.",
        "icon": "arrow-right",
    },
}


class LivenessService:
    """Manages presence verification dynamic challenge schedules and validation."""

    def __init__(self) -> None:
        pass

    def generate_session_schedule(
        self,
        duration_seconds: int = 180,
        challenge_count: int = 3,
        enabled: bool = True,
    ) -> list[dict[str, Any]]:
        """Generate a cryptographically random, non-repeating presence verification challenge schedule.

        Constraints:
        - Exactly 2 to 3 challenges per 180s pitch.
        - Minimum 45s gap between challenges.
        - First no earlier than 15s.
        - Last no later than D - 15s.
        - Never same challenge twice consecutively.
        - At least one head turn challenge when count >= 2.
        - Each challenge has a unique secure nonce.
        - If enabled is False (accessibility settings flag), returns empty list [].
        """
        if not enabled:
            logger.info("Presence verification challenge generation skipped (disabled for accessibility)")
            return []

        # Strictly 2 to 3 challenges
        count = max(2, min(3, challenge_count))
        min_gap = 45

        start_min = 15
        end_max = max(start_min + (count - 1) * min_gap + 15, duration_seconds - 15)

        times: list[int] = []
        if count == 2:
            t1 = start_min + 5 + secrets.randbelow(15)  # 20 to 34s
            t2 = t1 + min_gap + secrets.randbelow(max(1, end_max - (t1 + min_gap) + 1))
            times = [t1, min(t2, end_max)]
        else:
            # count == 3
            slack = max(0, end_max - start_min - (2 * min_gap))
            slack_step = max(1, slack // 3)
            t1 = start_min + secrets.randbelow(slack_step + 1)
            t2 = t1 + min_gap + secrets.randbelow(slack_step + 1)
            t3 = t2 + min_gap + secrets.randbelow(slack_step + 1)
            times = [t1, min(t2, end_max - min_gap), min(t3, end_max)]

        # Guarantee strict minimum 45s gap between all consecutive challenges
        for i in range(1, len(times)):
            if times[i] - times[i - 1] < min_gap:
                times[i] = times[i - 1] + min_gap

        # Select challenges ensuring no consecutive duplicates & at least one head turn
        selected_types: list[str] = []
        head_turns = ["Turn head LEFT", "Turn head RIGHT"]
        gestures = ["Open_Palm", "Thumb_Up", "Victory"]

        head_turn_idx = secrets.randbelow(count)

        for i in range(count):
            if i == head_turn_idx:
                candidates = [h for h in head_turns if not (selected_types and selected_types[-1] == h)]
                chosen = random.choice(candidates or head_turns)
            else:
                candidates = [c for c in CHALLENGE_TYPES if not (selected_types and selected_types[-1] == c)]
                chosen = random.choice(candidates)
            selected_types.append(chosen)

        # Build schedule objects with unique nonces and per-challenge metrics
        schedule: list[dict[str, Any]] = []
        for idx, (t, ctype) in enumerate(zip(times, selected_types)):
            nonce = secrets.token_hex(16)
            challenge_id = f"chal_{idx + 1}_{secrets.token_hex(4)}"
            i18n = CHALLENGE_I18N.get(ctype, {})
            schedule.append({
                "id": challenge_id,
                "type": ctype,
                "title": i18n.get("title", ctype),
                "scheduledAtSeconds": t,
                "windowSeconds": 5,
                "nonce": nonce,
                "status": "pending",  # pending | passed | failed | missed | errored
                "passed": None,
                "responseTimeMs": None,
                "confidence": None,
                "meanLuminance": None,
                "lightingQuality": None,
                "yaw": None,
                "snapshotUrl": None,
                "i18n": i18n,
            })

        logger.info(
            "Generated %d presence verification challenges for session (times: %s, types: %s)",
            count,
            [c["scheduledAtSeconds"] for c in schedule],
            [c["type"] for c in schedule],
        )
        return schedule

    def validate_challenge_response(
        self,
        current_challenge: dict[str, Any],
        client_response: dict[str, Any],
        dispatched_time: float,
    ) -> dict[str, Any]:
        """Validate client response with presence verification and replay protections.

        Client sends:
        { challengeId, nonce, expected, detected, confidence, yaw, passed, responseTimeMs, faceDetected, meanLuminance, lightingQuality, snapshot }
        """
        now = time.time()
        elapsed = now - dispatched_time
        nonce = client_response.get("nonce")
        cid = client_response.get("challengeId")

        # 1. Nonce validation
        if not nonce or nonce != current_challenge.get("nonce"):
            logger.warning("Presence verification rejected: Invalid or mismatched nonce %s", nonce)
            return {
                "valid": False,
                "status": "failed",
                "passed": False,
                "reason": "Invalid or replayed challenge nonce.",
            }

        # 2. Challenge ID validation
        if not cid or cid != current_challenge.get("id"):
            logger.warning("Presence verification rejected: Challenge ID mismatch %s", cid)
            return {
                "valid": False,
                "status": "failed",
                "passed": False,
                "reason": "Mismatched challenge ID.",
            }

        # 3. Grace window validation: 5s window + 1s network grace = 6.0s
        if elapsed > 6.0:
            logger.warning("Presence verification expired: response took %.2fs (limit 6.0s)", elapsed)
            return {
                "valid": False,
                "status": "missed",
                "passed": False,
                "reason": f"Challenge timeout: took {elapsed:.1f}s (window is 5s).",
                "responseTimeMs": int(elapsed * 1000),
            }

        # 4. Technical / Camera error handling
        if client_response.get("errored"):
            return {
                "valid": True,
                "status": "errored",
                "passed": False,
                "reason": client_response.get("errorMessage", "Client vision error"),
                "responseTimeMs": int(elapsed * 1000),
            }

        # Lighting Quality extraction (mean frame luminance)
        raw_lum = client_response.get("meanLuminance")
        if raw_lum is None:
            raw_lum = client_response.get("luminance", 120.0)
        try:
            mean_luminance = round(float(raw_lum), 1)
        except (ValueError, TypeError):
            mean_luminance = 120.0

        lighting_quality = client_response.get("lightingQuality") or (
            "low_light" if mean_luminance < 60 else "overexposed" if mean_luminance > 210 else "optimal"
        )

        confidence = client_response.get("confidence")
        if confidence is not None:
            try:
                confidence = round(float(confidence), 3)
            except (ValueError, TypeError):
                confidence = None

        # 5. Face detection requirement (Presence verification)
        if not client_response.get("faceDetected", True):
            return {
                "valid": True,
                "status": "failed",
                "passed": False,
                "reason": "Face was not present during presence verification challenge.",
                "responseTimeMs": int(elapsed * 1000),
                "confidence": confidence,
                "meanLuminance": mean_luminance,
                "lightingQuality": lighting_quality,
            }

        # 6. Success check
        passed = bool(client_response.get("passed"))
        status = "passed" if passed else "failed"

        return {
            "valid": True,
            "status": status,
            "passed": passed,
            "responseTimeMs": int(client_response.get("responseTimeMs", elapsed * 1000)),
            "confidence": confidence,
            "meanLuminance": mean_luminance,
            "lightingQuality": lighting_quality,
            "yaw": client_response.get("yaw"),
            "detected": client_response.get("detected"),
            "snapshot": client_response.get("snapshot"),
        }
