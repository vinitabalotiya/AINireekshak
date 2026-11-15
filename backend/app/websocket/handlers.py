"""WebSocket endpoint handlers for real-time live judging sessions."""

import asyncio
import json
import logging
import os
import time
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.event import Event
from app.models.session import Session
from app.models.submission import Submission
from app.models.team import Team
from app.models.transcript import Transcript, TranscriptCorrection
from app.services.ai.factory import get_ai_provider
from app.services.avatar.avatar_service import AvatarService
from app.services.documents.extractor import DocumentExtractor
from app.services.evaluation.scoring import normalize_behaviour_score
from app.services.liveness.scheduler import LivenessService
from app.services.speech.stt import SpeechRecognitionService
from app.services.speech.tts import TTSService
from app.services.telemetry.latency_tracker import latency_tracker
from app.websocket.manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

ws_manager = WebSocketManager()
stt_service = SpeechRecognitionService()
tts_service = TTSService()
avatar_service = AvatarService()
liveness_service = LivenessService()
_extractor = DocumentExtractor()

# Active liveness runtime tracker by session_id
_liveness_runners: dict[int, dict[str, Any]] = {}


async def _start_liveness_loop(session_id: int) -> None:
    """Background task to dispatch scheduled presence verification challenges."""
    runner = _liveness_runners.get(session_id)
    if not runner:
        return

    # Check accessibility flag: disable challenges if flagged
    if runner.get("disabled_for_accessibility"):
        logger.info("Presence verification challenges disabled for accessibility on session %s", session_id)
        return

    schedule = runner.get("schedule", [])
    start_time = runner.get("start_time", time.time())

    for challenge in schedule:
        if challenge.get("status") in ("passed", "failed", "missed"):
            continue

        target_time = start_time + challenge["scheduledAtSeconds"]
        wait_seconds = target_time - time.time()
        if wait_seconds > 0:
            await asyncio.sleep(wait_seconds)

        # Re-check runner existence (in case disconnected)
        if session_id not in _liveness_runners:
            break

        # VAD pause enforcement: never trigger during active speech (wait for pause of 400ms or more)
        max_vad_wait = 20.0
        vad_wait_start = time.time()
        while session_id in _liveness_runners:
            now = time.time()
            is_speaking = runner.get("is_speaking", False)
            last_speech = runner.get("last_speech_time", 0.0)
            silence_duration = now - last_speech

            if (is_speaking or (last_speech > 0 and silence_duration < 0.400)) and (now - vad_wait_start < max_vad_wait):
                await asyncio.sleep(0.1)
            else:
                break

        if session_id not in _liveness_runners:
            break

        runner["current_challenge"] = challenge
        runner["dispatch_time"] = time.time()

        # Dispatch presence verification challenge to participant
        logger.info(
            "Dispatching presence verification challenge %s (%s) to session %s (speech pause verified)",
            challenge["id"],
            challenge["type"],
            session_id,
        )
        await ws_manager.broadcast_to_session(str(session_id), {
            "type": "liveness_challenge",
            "challenge": {
                "id": challenge["id"],
                "nonce": challenge["nonce"],
                "type": challenge["type"],
                "title": challenge.get("title", challenge["type"]),
                "prompt": challenge.get("i18n", {}).get("en", challenge.get("title", challenge["type"])),
                "i18n": challenge.get("i18n", {}),
                "scheduledAt": challenge["scheduledAtSeconds"],
                "timeLimitSeconds": 5,
            },
        })

        # Wait for 5s + 1.2s grace
        await asyncio.sleep(6.2)

        # If not marked passed or failed yet, mark as missed
        if runner.get("current_challenge") and runner["current_challenge"]["id"] == challenge["id"]:
            if challenge["status"] == "pending":
                challenge["status"] = "missed"
                challenge["passed"] = False
                challenge["responseTimeMs"] = 5000
                logger.info(
                    "Presence verification challenge %s timed out (missed) for session %s (conf=%s, lum=%s)",
                    challenge["id"],
                    session_id,
                    challenge.get("confidence"),
                    challenge.get("meanLuminance"),
                )

                # Persist updated status
                await _persist_liveness_state(session_id, schedule)
                runner["current_challenge"] = None

                await ws_manager.broadcast_to_session(str(session_id), {
                    "type": "challenge_result",
                    "challenge_id": challenge["id"],
                    "status": "missed",
                    "passed": False,
                })


async def _persist_liveness_state(
    session_id: int,
    schedule: list[dict[str, Any]],
    disabled_for_accessibility: bool = False,
) -> None:
    """Compute aggregate counts, log per-challenge metrics, update DB session presence verification flag, and broadcast."""
    if disabled_for_accessibility or len(schedule) == 0:
        liveness_flag = "EXEMPT_ACCESSIBILITY"
        flag_reason = "Presence verification challenges disabled for accessibility requirements."
        passed_count = 0
        failed_count = 0
        total_count = 0
    else:
        failed_count = sum(1 for c in schedule if c.get("status") in ("failed", "missed"))
        passed_count = sum(1 for c in schedule if c.get("status") == "passed")
        total_count = len(schedule)
        liveness_flag = "FLAGGED" if failed_count > 1 else "VERIFIED"
        flag_reason = (
            f"Suspected non-live participant: {failed_count} of {total_count} presence verification challenges failed or missed."
            if failed_count > 1
            else "Presence verified through dynamic challenges."
        )

    # Per-challenge logging: pass/fail, confidence, lighting-quality estimate (mean frame luminance)
    for c in schedule:
        logger.info(
            "Presence verification challenge log [Session %s | %s]: status=%s, passed=%s, confidence=%s, meanLuminance=%s, lightingQuality=%s, responseTimeMs=%s",
            session_id,
            c.get("id"),
            c.get("status"),
            c.get("passed"),
            c.get("confidence"),
            c.get("meanLuminance"),
            c.get("lightingQuality"),
            c.get("responseTimeMs"),
        )

    liveness_data = {
        "challenges": schedule,
        "total_challenges": total_count,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "liveness_flag": liveness_flag,
        "flag_reason": flag_reason,
        "accessibility_disabled": disabled_for_accessibility,
    }

    try:
        async with async_session_factory() as db:
            sess_res = await db.execute(select(Session).where(Session.id == session_id))
            sess = sess_res.scalar_one_or_none()
            if sess:
                sess.liveness_flag = liveness_flag
                sess.liveness_data = liveness_data
                await db.commit()
    except Exception as e:
        logger.warning("Could not persist presence verification state for session %s: %s", session_id, e)

    # Broadcast presence verification summary update to admin and participant rooms
    await ws_manager.broadcast_to_session(str(session_id), {
        "type": "liveness_summary_update",
        "data": {
            "liveness_flag": liveness_flag,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "total_challenges": total_count,
            "flag_reason": flag_reason,
            "accessibility_disabled": disabled_for_accessibility,
            "challenges": [
                {
                    "id": c["id"],
                    "type": c["type"],
                    "title": c.get("title"),
                    "status": c.get("status"),
                    "passed": c.get("passed"),
                    "responseTimeMs": c.get("responseTimeMs"),
                    "confidence": c.get("confidence"),
                    "meanLuminance": c.get("meanLuminance"),
                    "lightingQuality": c.get("lightingQuality"),
                    "hasSnapshot": bool(c.get("snapshotUrl")),
                }
                for c in schedule
            ],
        },
    })


async def _synthesize_and_stream_audio(
    session_id: int,
    selected_q: str,
    session_lang: str,
    turn_number: int,
    t0_stt: float | None,
    t1_ws_rx: float,
    t2_gemini_start: float,
    t3_gemini_end: float,
) -> None:
    """Background task to synthesize TTS audio and stream when ready (Gemini >4s timeout fallback)."""
    t4_tts_start = time.time()
    tts_failed = False
    tts_res = None
    try:
        tts_res = tts_service.synthesize_speech(selected_q, language=session_lang)
        if not tts_res or not tts_res.get("audio_base64"):
            tts_failed = True
    except Exception as err:
        logger.warning("Background TTS synthesis error for session %s: %s", session_id, err)
        tts_failed = True

    t5_tts_end = time.time()
    tts_duration_ms = (t5_tts_end - t4_tts_start) * 1000.0
    latency_tracker.record_stage("tts_duration", tts_duration_ms)

    if tts_failed:
        latency_tracker.record_fallback("tts_failure_text_only")
        logger.info("TTS stream fallback: text-only remains active for session %s", session_id)
        return

    speech_pkt = avatar_service.create_speech_response(selected_q, language=session_lang)
    await ws_manager.send_ai_message(str(session_id), {
        "type": "ai_audio_stream",
        "question": selected_q,
        "turn": turn_number,
        "audio_base64": tts_res.get("audio_base64"),
        "voice_text": tts_res.get("voice_text", selected_q),
        "voice_lang": tts_res.get("voice_lang", "en"),
        "speech": speech_pkt,
        "t5_dispatch_time": t5_tts_end,
    })

    latency_tracker.record_full_trace(
        t0_stt=t0_stt,
        t1_ws_rx=t1_ws_rx,
        t2_gemini_start=t2_gemini_start,
        t3_gemini_end=t3_gemini_end,
        t4_tts_start=t4_tts_start,
        t5_tts_end=t5_tts_end,
        metadata={"session_id": session_id, "turn": turn_number, "async_audio_stream": True},
    )


@router.websocket("/ws/session/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: int) -> None:
    """Live interactive judging session WebSocket endpoint."""
    await ws_manager.connect(websocket, str(session_id), client_type="participant")
    ai_provider = get_ai_provider()

    # Check accessibility disablement flag from query params or event/session configuration
    query_params = websocket.query_params
    is_accessible_exempt = (
        query_params.get("accessibility") == "true"
        or query_params.get("disable_presence_verification") == "true"
        or query_params.get("accessibility_disable_challenges") == "true"
    )

    # Initialize or restore presence verification schedule for this session
    schedule: list[dict[str, Any]] = []
    try:
        async with async_session_factory() as db:
            sess_res = await db.execute(select(Session).where(Session.id == session_id))
            sess = sess_res.scalar_one_or_none()

            if sess and sess.event_id:
                evt_res = await db.execute(select(Event).where(Event.id == sess.event_id))
                evt = evt_res.scalar_one_or_none()
                if evt and evt.liveness_settings and isinstance(evt.liveness_settings, dict):
                    if (
                        evt.liveness_settings.get("accessibility_disable_challenges") is True
                        or evt.liveness_settings.get("presence_verification_enabled") is False
                        or evt.liveness_settings.get("enabled") is False
                    ):
                        is_accessible_exempt = True

            if sess and sess.liveness_data and isinstance(sess.liveness_data, dict):
                if sess.liveness_data.get("accessibility_disabled"):
                    is_accessible_exempt = True
                existing_challenges = sess.liveness_data.get("challenges")
                if isinstance(existing_challenges, list) and len(existing_challenges) > 0 and not is_accessible_exempt:
                    schedule = existing_challenges
                    logger.info("Restored existing %d presence verification challenges for session %s", len(schedule), session_id)

            if not schedule:
                schedule = liveness_service.generate_session_schedule(
                    duration_seconds=180,
                    challenge_count=3,
                    enabled=not is_accessible_exempt,
                )
                if sess:
                    l_flag = "EXEMPT_ACCESSIBILITY" if is_accessible_exempt else "VERIFIED"
                    f_reason = (
                        "Presence verification challenges disabled for accessibility requirements."
                        if is_accessible_exempt
                        else "Presence verified through dynamic challenges."
                    )
                    sess.liveness_flag = l_flag
                    sess.liveness_data = {
                        "challenges": schedule,
                        "total_challenges": len(schedule),
                        "passed_count": 0,
                        "failed_count": 0,
                        "liveness_flag": l_flag,
                        "flag_reason": f_reason,
                        "accessibility_disabled": is_accessible_exempt,
                    }
                    await db.commit()
    except Exception as init_err:
        logger.warning("Presence verification schedule initialization notice: %s", init_err)
        if not schedule:
            schedule = liveness_service.generate_session_schedule(
                duration_seconds=180,
                challenge_count=3,
                enabled=not is_accessible_exempt,
            )

    # Store in memory runner
    if session_id not in _liveness_runners:
        _liveness_runners[session_id] = {
            "schedule": schedule,
            "start_time": time.time(),
            "current_challenge": None,
            "dispatch_time": 0,
            "task": None,
            "last_speech_time": 0.0,
            "is_speaking": False,
            "disabled_for_accessibility": is_accessible_exempt,
        }
    else:
        _liveness_runners[session_id]["disabled_for_accessibility"] = is_accessible_exempt

    # Start presence verification loop in background if not already active and not exempt
    runner = _liveness_runners[session_id]
    if not is_accessible_exempt and (runner.get("task") is None or runner["task"].done()):
        runner["task"] = asyncio.create_task(_start_liveness_loop(session_id))

    try:
        # Send initial welcome and avatar greeting
        await ws_manager.send_ai_message(str(session_id), {
            "type": "welcome",
            "message": "AiNireekshak Judge room initialized. You may speak naturally in English, Hindi, or Hinglish.",
            "avatar_state": "idle",
        })

        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            event_type = data.get("type")

            # 1. Spoken audio / text transcript chunk from participant
            if event_type == "transcript_chunk":
                now_t = time.time()
                runner["last_speech_time"] = now_t
                runner["is_speaking"] = True

                # Measure STT -> WS latency
                client_t = data.get("client_timestamp")
                if client_t:
                    try:
                        stt_lat = max(0.0, (now_t - (float(client_t) / 1000.0)) * 1000.0)
                        latency_tracker.record_stage("stt_to_ws", stt_lat)
                    except (ValueError, TypeError):
                        pass

                content = data.get("content", "").strip()
                target_lang = data.get("language") or "hi"
                if not content:
                    continue

                processed = stt_service.process_transcription(
                    content, speaker="participant", target_mode=target_lang
                )

                # Store transcript in database safely
                try:
                    async with async_session_factory() as db:
                        sess_res = await db.execute(select(Session).where(Session.id == session_id))
                        sess = sess_res.scalar_one_or_none()
                        if not sess:
                            team_res = await db.execute(select(Team).limit(1))
                            first_team = team_res.scalar_one_or_none()
                            if first_team:
                                sess = Session(
                                    id=session_id,
                                    team_id=first_team.id,
                                    event_id=first_team.event_id,
                                    status="active",
                                    duration_minutes=3,
                                    livekit_room_name=f"session_{session_id}",
                                )
                                db.add(sess)
                                await db.commit()

                        t_record = Transcript(
                            session_id=session_id,
                            speaker="participant",
                            content=processed["content"],
                            language=processed["language"],
                            romanized_content=processed["romanized_content"],
                            confidence=processed["confidence"],
                        )
                        db.add(t_record)
                        await db.commit()
                        await db.refresh(t_record)
                        processed["id"] = t_record.id
                except Exception as e:
                    logger.warning("Could not persist transcript for session %s: %s", session_id, e)

                # Broadcast live caption to room
                await ws_manager.send_caption(str(session_id), processed)

            # 1b. Participant speech status (VAD)
            elif event_type == "speech_status":
                is_spk = bool(data.get("is_speaking", False))
                runner["is_speaking"] = is_spk
                if not is_spk:
                    runner["last_speech_time"] = time.time()

            # 2. Participant correction of misheard transcription
            elif event_type == "correction":
                orig = data.get("original_content", "")
                corrected = data.get("corrected_content", "")
                transcript_id = data.get("transcript_id")

                corr_data = stt_service.apply_correction(orig, corrected, corrected_by="participant")

                try:
                    async with async_session_factory() as db:
                        if transcript_id:
                            corr_record = TranscriptCorrection(
                                transcript_id=transcript_id,
                                original_content=orig,
                                corrected_content=corrected,
                                corrected_by="participant",
                            )
                            db.add(corr_record)
                            await db.commit()
                except Exception as e:
                    logger.warning("Could not persist transcript correction: %s", e)

                # Broadcast correction update
                await ws_manager.broadcast_to_session(str(session_id), {
                    "type": "caption_corrected",
                    "data": corr_data,
                })

            # 3. Presence Verification Challenge Response Verification
            elif event_type == "challenge_response":
                cid = data.get("challengeId") or data.get("challenge_id")
                snapshot = data.get("snapshot")  # Base64 thumbnail

                current_runner = _liveness_runners.get(session_id)
                current_ch = current_runner.get("current_challenge") if current_runner else None

                if current_ch and current_ch.get("id") == cid:
                    dispatched_t = current_runner.get("dispatch_time", time.time())
                    val_res = liveness_service.validate_challenge_response(current_ch, data, dispatched_t)

                    current_ch["status"] = val_res["status"]
                    current_ch["passed"] = val_res["passed"]
                    current_ch["responseTimeMs"] = val_res.get("responseTimeMs", 2000)
                    current_ch["confidence"] = val_res.get("confidence")
                    current_ch["meanLuminance"] = val_res.get("meanLuminance")
                    current_ch["lightingQuality"] = val_res.get("lightingQuality")
                    current_ch["yaw"] = val_res.get("yaw")
                    current_ch["detected"] = val_res.get("detected")
                    if snapshot:
                        current_ch["snapshotUrl"] = snapshot[:50000]

                    logger.info(
                        "Presence verification response recorded [Session %s | Challenge %s]: status=%s, passed=%s, confidence=%s, meanLuminance=%s, lightingQuality=%s",
                        session_id,
                        cid,
                        val_res["status"],
                        val_res["passed"],
                        val_res.get("confidence"),
                        val_res.get("meanLuminance"),
                        val_res.get("lightingQuality"),
                    )

                    await _persist_liveness_state(
                        session_id,
                        current_runner["schedule"],
                        disabled_for_accessibility=current_runner.get("disabled_for_accessibility", False),
                    )
                    current_runner["current_challenge"] = None

                    await ws_manager.broadcast_to_session(str(session_id), {
                        "type": "challenge_result",
                        "challenge_id": cid,
                        "status": val_res["status"],
                        "passed": val_res["passed"],
                        "responseTimeMs": current_ch["responseTimeMs"],
                        "confidence": current_ch["confidence"],
                        "meanLuminance": current_ch["meanLuminance"],
                        "lightingQuality": current_ch["lightingQuality"],
                    })

            # 4. Request AI Follow-up Question (Turn-based Multi-question Q&A State Machine)
            elif event_type == "request_ai_question":
                t1_ws_rx = time.time()
                client_timestamp = data.get("client_timestamp")
                t0_stt = (float(client_timestamp) / 1000.0) if client_timestamp else None
                if t0_stt:
                    stt_ws_ms = max(0.0, (t1_ws_rx - t0_stt) * 1000.0)
                    latency_tracker.record_stage("stt_to_ws", stt_ws_ms)

                pitch_context = data.get("pitch_summary", "").strip()
                client_team_id = data.get("team_id")
                if client_team_id is not None:
                    try:
                        client_team_id = int(client_team_id)
                    except (ValueError, TypeError):
                        pass
                behaviour_summary = data.get("behaviour_summary") or {}
                is_forced = bool(data.get("force"))

                async with async_session_factory() as db:
                    sess_res = await db.execute(select(Session).where(Session.id == session_id))
                    session_record = sess_res.scalar_one_or_none()
                    team_id = client_team_id or (session_record.team_id if session_record else None) or session_id
                    try:
                        if team_id is not None:
                            team_id = int(team_id)
                    except (ValueError, TypeError):
                        pass

                    ppt_submission = None
                    if team_id:
                        sub_res = await db.execute(
                            select(Submission).where(
                                Submission.team_id == team_id,
                                Submission.submission_type.in_(["presentation", "document", "ppt", "deck", "slides"]),
                            ).order_by(Submission.created_at.desc())
                        )
                        ppt_submission = sub_res.scalars().first()

                    # Auto-analyze PPT if uploaded and not analyzed yet
                    if ppt_submission and (ppt_submission.status != "analyzed" or not ppt_submission.analysis_result):
                        try:
                            ext = os.path.splitext(ppt_submission.file_path)[1].lower() if ppt_submission.file_path else ".pptx"
                            extracted = _extractor.extract_by_type(ppt_submission.file_path, ext) if ppt_submission.file_path else ""
                            ppt_submission.extracted_text = extracted
                            analysis = await ai_provider.analyze_project(
                                text=extracted or ppt_submission.original_filename or "",
                                context={"submission_type": "presentation", "team_id": team_id, "filename": ppt_submission.original_filename}
                            )
                            ppt_submission.analysis_result = analysis
                            ppt_submission.status = "analyzed"
                            await db.commit()
                        except Exception as auto_err:
                            logger.warning("On-the-fly analysis fallback: %s", auto_err)

                    # Extract PPT context fields for Q&A generation
                    ppt_analysis_data = ppt_submission.analysis_result if (ppt_submission and ppt_submission.analysis_result) else {}
                    ppt_extracted_text = ppt_submission.extracted_text if ppt_submission else ""
                    ppt_filename = ppt_submission.original_filename if ppt_submission else ""
                    has_ppt = ppt_submission is not None

                    # Retrieve all prior transcripts for this session
                    t_res = await db.execute(
                        select(Transcript).where(Transcript.session_id == session_id).order_by(Transcript.created_at.asc())
                    )
                    all_transcripts = t_res.scalars().all()

                participant_transcripts = [t for t in all_transcripts if t.speaker == "participant"]
                ai_transcripts = [t for t in all_transcripts if t.speaker == "ai_judge"]
                turn_number = len(ai_transcripts) + 1
                combined_spoken_pitch = " ".join(t.content for t in participant_transcripts).strip()

                # If NEITHER pitch nor PPT deck exists and not explicitly forced by button click, prompt participant
                effective_pitch = pitch_context or combined_spoken_pitch
                if not is_forced and not has_ppt and len(effective_pitch) < 5 and len(participant_transcripts) == 0:
                    logger.info("Pitch and PPT not started yet for session %s", session_id)
                    await ws_manager.send_ai_message(str(session_id), {
                        "avatar_state": "listening",
                        "message": "Welcome! Please deliver your project pitch or upload your presentation deck in Hindi, Hinglish, or English.",
                    })
                    continue

                # Determine session language mode
                req_lang = data.get("language")
                participant_recent_text = participant_transcripts[-1].content if participant_transcripts else effective_pitch

                if req_lang in ("hi", "hinglish", "en"):
                    session_lang = req_lang
                else:
                    is_hindi = any('\u0900' <= char <= '\u097F' for char in participant_recent_text)
                    is_hinglish = any(
                        w in participant_recent_text.lower().split() for w in ["humne", "karenge", "karna", "bhi", "bahut", "kaise", "hai"]
                    )
                    session_lang = "hi" if is_hindi else "hinglish" if is_hinglish else "en"

                # Check if participant's last response was vague (Cross-questioning trigger)
                last_answer = participant_transcripts[-1].content if participant_transcripts else ""
                is_vague = (turn_number > 1 and len(last_answer.strip()) < 35) or any(
                    last_answer.strip().lower() == phrase for phrase in ["yes", "no", "we used ai", "humne banaya", "it works", "haan"]
                )

                # Check if Q&A rounds reached completion (auto-complete after round 6 if not forced by user click)
                if turn_number > 6 and not is_forced:
                    completion_msg = (
                        "बहुत-बहुत धन्यवाद! आपका तकनीकी मूल्यांकन पूरा हो चुका है। आधिकारिक स्कोरकार्ड तैयार किया जा रहा है।"
                        if session_lang == "hi"
                        else "Thank you so much! Judging round complete ho gaya hai. Ab aap dashboard par final evaluation scorecard dekh sakte hain."
                        if session_lang == "hinglish"
                        else "Thank you! That completes our technical evaluation session. Generating your comprehensive scorecard now."
                    )

                    tts_res = tts_service.synthesize_speech(completion_msg, language=session_lang)

                    await ws_manager.send_ai_message(str(session_id), {
                        "avatar_state": "idle",
                        "question": completion_msg,
                        "audio_base64": tts_res.get("audio_base64"),
                        "voice_text": tts_res.get("voice_text", completion_msg),
                        "voice_lang": tts_res.get("voice_lang", "en"),
                        "completed": True,
                    })
                    continue

                # Transition avatar to thinking
                await ws_manager.send_ai_message(str(session_id), {
                    "avatar_state": "thinking",
                    "message": f"Formulating Round {turn_number} technical inquiry...",
                })

                t2_gemini_start = time.time()
                selected_q = ""
                gemini_timed_out = False

                # Cross-questioning logic if answer was vague
                if is_vague:
                    logger.info("Triggering cross-question for session %s (vague answer: '%s')", session_id, last_answer)
                    if session_lang == "hi":
                        selected_q = "कृपया तकनीकी रूप से और स्पष्ट करें: आपने इसे हासिल करने के लिए कौन से ठोस एल्गोरिदम, डेटाबेस इंडेक्सिंग या सुरक्षा उपाय लागू किए?"
                    elif session_lang == "hinglish":
                        selected_q = "Thoda aur technically detail me samjhaiye: implementation me kaun se concrete algorithms, database indexing ya security guardrails use kiye?"
                    else:
                        selected_q = "Could you be more specific on your technical implementation? Which concrete algorithms, indexing strategies, or security guardrails did you implement?"
                    t3_gemini_end = time.time()
                    latency_tracker.record_stage("gemini_duration", (t3_gemini_end - t2_gemini_start) * 1000.0)
                else:
                    # Grounded question from AI provider with 4.0s timeout requirement
                    try:
                        async def _fetch_ai_questions():
                            return await ai_provider.generate_questions({
                                "pitch": effective_pitch,
                                "session_id": session_id,
                                "turn": turn_number,
                                "ppt_analysis": ppt_analysis_data,
                                "extracted_text": ppt_extracted_text,
                                "original_filename": ppt_filename,
                                "behaviour_summary": behaviour_summary,
                                "language": session_lang,
                            })

                        questions = await asyncio.wait_for(_fetch_ai_questions(), timeout=4.0)
                        t3_gemini_end = time.time()
                        latency_tracker.record_stage("gemini_duration", (t3_gemini_end - t2_gemini_start) * 1000.0)
                        if questions:
                            selected_q = questions[(turn_number - 1) % len(questions)]
                    except asyncio.TimeoutError:
                        t3_gemini_end = time.time()
                        gemini_timed_out = True
                        latency_tracker.record_fallback("gemini_timeout_4s")
                        latency_tracker.record_stage("gemini_duration", (t3_gemini_end - t2_gemini_start) * 1000.0)
                        logger.warning(
                            "Gemini question generation took > 4.0s for session %s - falling back to immediate on-screen text",
                            session_id,
                        )
                    except Exception as q_err:
                        t3_gemini_end = time.time()
                        latency_tracker.record_stage("gemini_duration", (t3_gemini_end - t2_gemini_start) * 1000.0)
                        logger.warning("generate_questions fallback (%s)", q_err)

                if not selected_q:
                    if session_lang == "hi":
                        questions_pool = [
                            "आपके सिस्टम का कोर आर्किटेक्चर क्या है, और हाई यूजर लोड के समय यह डेटा कंसिस्टेंसी कैसे बनाए रखता है?",
                            "क्या आपने नेटवर्क फेलियर या ऑफलाइन मोड के दौरान डेटा सिंक की कोई रणनीति बनाई है?",
                            "इस प्रोजेक्ट के इम्प्लीमेंटेशन में सबसे बड़ी तकनीकी चुनौती क्या थी और आपने उसे कैसे सॉल्व किया?",
                            "आपके सॉल्यूशन की सुरक्षा, रेट लिमिटिंग और एपीआई ऑथेंटिकेशन का क्या फ्लो है?",
                        ]
                    elif session_lang == "hinglish":
                        questions_pool = [
                            "Aapke system ka core architecture kya hai, aur high concurrency par scalability kaise handle hoti hai?",
                            "Offline data synchronization aur edge network failure recovery ke liye aapne kya approach use ki hai?",
                            "Implementation ke dauran sabse challenging technical issue kya tha aur use kaise debug kiya?",
                            "API authentication aur data security protect karne ke liye kaun se guardrails lagaye hain?",
                        ]
                    else:
                        questions_pool = [
                            "Could you elaborate on your core architecture and how your data model ensures consistency under concurrent load?",
                            "How does your solution handle offline synchronization, edge network dropouts, and state reconciliation?",
                            "What was the most challenging technical hurdle during implementation and what profiling or benchmarks did you perform?",
                            "What security mechanisms and rate-limiting guardrails are implemented across your backend API layer?",
                        ]
                    selected_q = questions_pool[(turn_number - 1) % len(questions_pool)]

                # Persist AI question in transcript database
                try:
                    async with async_session_factory() as db:
                        t_record = Transcript(
                            session_id=session_id,
                            speaker="ai_judge",
                            content=selected_q,
                            language=session_lang,
                            romanized_content=selected_q,
                            confidence=1.0,
                        )
                        db.add(t_record)
                        await db.commit()
                except Exception as e:
                    logger.warning("Could not persist AI transcript: %s", e)

                # Fallback: if Gemini took > 4s, dispatch question as on-screen text immediately and stream audio when ready
                if gemini_timed_out:
                    t5_interim_dispatch = time.time()
                    await ws_manager.send_ai_message(str(session_id), {
                        "avatar_state": "speaking",
                        "question": selected_q,
                        "turn": turn_number,
                        "language": session_lang,
                        "text_only_interim": True,
                        "t5_dispatch_time": t5_interim_dispatch,
                    })

                    # Stream audio in background task
                    asyncio.create_task(_synthesize_and_stream_audio(
                        session_id=session_id,
                        selected_q=selected_q,
                        session_lang=session_lang,
                        turn_number=turn_number,
                        t0_stt=t0_stt,
                        t1_ws_rx=t1_ws_rx,
                        t2_gemini_start=t2_gemini_start,
                        t3_gemini_end=t3_gemini_end,
                    ))
                    continue

                # Standard flow: Gemini completed in <= 4.0s -> synthesize TTS
                t4_tts_start = time.time()
                tts_failed = False
                tts_res = None
                try:
                    tts_res = tts_service.synthesize_speech(selected_q, language=session_lang)
                    if not tts_res or not tts_res.get("audio_base64"):
                        tts_failed = True
                except Exception as tts_err:
                    logger.warning("TTS synthesis error for session %s, falling back to text-only: %s", session_id, tts_err)
                    tts_failed = True

                t5_tts_end = time.time()
                tts_duration_ms = (t5_tts_end - t4_tts_start) * 1000.0
                latency_tracker.record_stage("tts_duration", tts_duration_ms)

                if tts_failed:
                    latency_tracker.record_fallback("tts_failure_text_only")
                    tts_res = {
                        "audio_base64": None,
                        "voice_text": selected_q,
                        "voice_lang": session_lang,
                        "tts_failed": True,
                    }

                speech_pkt = avatar_service.create_speech_response(selected_q, language=session_lang)

                # Dispatch AI question and voice audio payload over WebSocket
                await ws_manager.send_ai_message(str(session_id), {
                    "avatar_state": "speaking",
                    "question": selected_q,
                    "turn": turn_number,
                    "language": session_lang,
                    "audio_base64": tts_res.get("audio_base64"),
                    "voice_text": tts_res.get("voice_text", selected_q),
                    "voice_lang": tts_res.get("voice_lang", "en"),
                    "speech": speech_pkt,
                    "tts_failed": tts_failed,
                    "t5_dispatch_time": t5_tts_end,
                })

                latency_tracker.record_full_trace(
                    t0_stt=t0_stt,
                    t1_ws_rx=t1_ws_rx,
                    t2_gemini_start=t2_gemini_start,
                    t3_gemini_end=t3_gemini_end,
                    t4_tts_start=t4_tts_start,
                    t5_tts_end=t5_tts_end,
                    metadata={"session_id": session_id, "turn": turn_number, "tts_failed": tts_failed},
                )

            # 4b. Client playback started event (computes dispatch_to_playback & E2E)
            elif event_type == "playback_started":
                t5_disp = data.get("t5_dispatch_time")
                playback_t = data.get("client_playback_timestamp") or time.time()
                if t5_disp:
                    try:
                        pb_ms = max(0.0, (float(playback_t) - float(t5_disp)) * 1000.0)
                        latency_tracker.record_stage("dispatch_to_playback", pb_ms)
                    except (ValueError, TypeError):
                        pass

            # 4c. WebSocket auto-reconnected report & buffer flush confirmation
            elif event_type == "ws_reconnected":
                flushed_count = int(data.get("flushed_count", 0))
                latency_tracker.record_fallback("ws_reconnects", 1)
                if flushed_count > 0:
                    latency_tracker.record_fallback("buffered_chunks_flushed", flushed_count)
                logger.info("Session %s reconnected over WS (flushed %d buffered chunks)", session_id, flushed_count)

            # 4d. Dynamic accessibility settings update
            elif event_type == "update_accessibility":
                disable_chal = bool(data.get("disable_presence_verification", True))
                runner["disabled_for_accessibility"] = disable_chal
                await _persist_liveness_state(
                    session_id,
                    runner.get("schedule", []),
                    disabled_for_accessibility=disable_chal,
                )
                logger.info("Updated presence verification accessibility status for session %s: disabled=%s", session_id, disable_chal)

            # 5. Real-time Camera Behaviour Telemetry (Google MediaPipe Task Vision)
            elif event_type == "behaviour_telemetry":
                telemetry = data.get("telemetry") or data
                raw_confidence = telemetry.get("confidence_score", 50)
                norm_score = normalize_behaviour_score(raw_confidence)

                # Update speaking status from vision/audio
                if telemetry.get("is_speaking"):
                    runner["is_speaking"] = True
                    runner["last_speech_time"] = time.time()

                # Update session behavioral data in database
                try:
                    async with async_session_factory() as db:
                        sess_res = await db.execute(select(Session).where(Session.id == session_id))
                        sess = sess_res.scalar_one_or_none()
                        if sess:
                            sess.behavioural_data = {
                                "last_telemetry": telemetry,
                                "raw_confidence": raw_confidence,
                                "normalized_score": norm_score,
                                "eye_contact_score": telemetry.get("eye_contact_score"),
                                "attention_score": telemetry.get("attention_score"),
                                "dominant_orientation": telemetry.get("orientation", "Centered"),
                                "delivery_status": telemetry.get("delivery_status", "Active"),
                            }
                            await db.commit()
                except Exception as b_err:
                    logger.debug("Telemetry persistence notice: %s", b_err)

            # 6. Heartbeat ping
            elif event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, str(session_id))
    except Exception as e:
        logger.error("Error in session websocket %s: %s", session_id, e)
        ws_manager.disconnect(websocket, str(session_id))


@router.websocket("/ws/admin/monitor/{session_id}")
async def admin_monitor_websocket(websocket: WebSocket, session_id: int) -> None:
    """Admin live monitoring WebSocket endpoint."""
    await ws_manager.connect(websocket, str(session_id), client_type="admin")
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
                if msg.get("type") == "admin_note":
                    await ws_manager.broadcast_to_session(str(session_id), {
                        "type": "admin_announcement",
                        "message": msg.get("message", ""),
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, str(session_id))
