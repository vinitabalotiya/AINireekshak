"""WebSocket endpoint handlers for real-time live judging sessions."""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.session import Session
from app.models.transcript import Transcript, TranscriptCorrection
from app.services.ai.factory import get_ai_provider
from app.services.avatar.avatar_service import AvatarService
from app.services.speech.stt import SpeechRecognitionService
from app.websocket.manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

ws_manager = WebSocketManager()
stt_service = SpeechRecognitionService()
avatar_service = AvatarService()


@router.websocket("/ws/session/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: int) -> None:
    """Live interactive judging session WebSocket endpoint."""
    await ws_manager.connect(websocket, str(session_id), client_type="participant")
    ai_provider = get_ai_provider()

    try:
        # Send initial welcome and avatar greeting
        await ws_manager.send_ai_message(str(session_id), {
            "type": "welcome",
            "message": "AiNireekshak Judge room initialized. You may speak in English, Hindi, or Hinglish.",
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
                content = data.get("content", "")
                processed = stt_service.process_transcription(content, speaker="participant")

                # Store transcript in database
                async with async_session_factory() as db:
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

                # Broadcast live caption to room
                await ws_manager.send_caption(str(session_id), processed)

            # 2. Participant correction or repeat of transcription
            elif event_type == "correction":
                orig = data.get("original_content", "")
                corrected = data.get("corrected_content", "")
                transcript_id = data.get("transcript_id")

                corr_data = stt_service.apply_correction(orig, corrected, corrected_by="participant")

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

                # Broadcast correction update
                await ws_manager.broadcast_to_session(str(session_id), {
                    "type": "caption_corrected",
                    "data": corr_data,
                })

            # 3. Request AI Follow-up Question
            elif event_type == "request_ai_question":
                pitch_context = data.get("pitch_summary", "Presentation in progress.")
                # Transition avatar to thinking
                await ws_manager.send_ai_message(str(session_id), {
                    "avatar_state": "thinking",
                    "message": "Analyzing pitch and formulating technical follow-up...",
                })

                questions = await ai_provider.generate_questions({
                    "pitch": pitch_context,
                    "session_id": session_id,
                })
                selected_q = questions[0] if questions else "Can you elaborate on your technology choices?"

                # Transition avatar to speaking
                speech_pkt = avatar_service.create_speech_response(selected_q)

                # Store AI question in DB
                async with async_session_factory() as db:
                    t_record = Transcript(
                        session_id=session_id,
                        speaker="ai_judge",
                        content=selected_q,
                        language="en",
                        romanized_content=selected_q,
                        confidence=1.0,
                    )
                    db.add(t_record)
                    await db.commit()

                await ws_manager.send_ai_message(str(session_id), {
                    "avatar_state": "speaking",
                    "question": selected_q,
                    "speech": speech_pkt,
                })

            # 4. Heartbeat ping
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
            # Admins can observe or broadcast intervention notices
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
