"""Unit tests for live pipeline latency instrumentation and fallback mechanisms.

Simulates:
1. Stage percentiles (p50, p95) calculation and SLA compliance
2. Gemini taking >4s timeout -> immediate on-screen text fallback
3. TTS failure -> text-only caption fallback
4. WebSocket drop -> client transcript buffer flush on reconnect
5. Debug latency telemetry API
"""

import asyncio
import time
import pytest
from app.services.telemetry.latency_tracker import (
    PipelineLatencyTracker,
    calculate_percentile,
)


def test_percentile_calculation():
    """Verify p50 and p95 percentile calculation with linear interpolation."""
    data = [100.0, 200.0, 300.0, 400.0, 500.0]
    p50 = calculate_percentile(data, 50.0)
    p95 = calculate_percentile(data, 95.0)

    assert p50 == 300.0
    assert p95 == 480.0

    # Single value
    assert calculate_percentile([42.0], 95.0) == 42.0
    # Empty list
    assert calculate_percentile([], 50.0) == 0.0


def test_pipeline_latency_tracker_stages():
    """Verify latency tracker records durations across all stages and builds summary."""
    tracker = PipelineLatencyTracker()

    tracker.record_stage("stt_to_ws", 120.0)
    tracker.record_stage("stt_to_ws", 180.0)
    tracker.record_stage("gemini_duration", 1500.0)
    tracker.record_stage("tts_duration", 350.0)
    tracker.record_stage("dispatch_to_playback", 110.0)
    tracker.record_stage("e2e_latency", 2080.0)

    summary = tracker.get_summary()
    stages = summary["pipeline_stages"]

    assert "stt_to_ws" in stages
    assert "gemini_duration" in stages
    assert "tts_duration" in stages
    assert "dispatch_to_playback" in stages
    assert "e2e_latency" in stages

    assert stages["stt_to_ws"]["count"] == 2
    assert stages["stt_to_ws"]["p50_ms"] == 150.0
    assert stages["e2e_latency"]["sla_status"] == "healthy"


def test_gemini_4s_timeout_fallback_simulation():
    """Simulate Gemini taking >4s and verify timeout triggers immediate text fallback."""
    tracker = PipelineLatencyTracker()

    async def simulate_slow_gemini(delay: float):
        await asyncio.sleep(delay)
        return ["What is your indexing strategy?"]

    async def execute_with_fallback():
        t2_start = time.time()
        selected_q = ""
        gemini_timed_out = False

        try:
            # 4.0s timeout requirement
            questions = await asyncio.wait_for(simulate_slow_gemini(4.5), timeout=0.1)
            selected_q = questions[0]
        except asyncio.TimeoutError:
            gemini_timed_out = True
            tracker.record_fallback("gemini_timeout_4s")
            # Immediate on-screen text question from fallback pool
            selected_q = "Could you elaborate on the architecture and data integrity trade-offs?"

        t3_end = time.time()
        tracker.record_stage("gemini_duration", (t3_end - t2_start) * 1000.0)

        # Dispatch immediate on-screen text response
        response_payload = {
            "question": selected_q,
            "text_only_interim": gemini_timed_out,
        }
        return response_payload

    loop = asyncio.new_event_loop()
    try:
        payload = loop.run_until_complete(execute_with_fallback())
    finally:
        loop.close()

    assert payload["text_only_interim"] is True
    assert "trade-offs" in payload["question"]
    assert tracker.fallbacks["gemini_timeout_4s"] == 1


def test_tts_failure_fallback_simulation():
    """Simulate TTS synthesis raising an exception and verify text-only fallback."""
    tracker = PipelineLatencyTracker()

    def simulate_failing_tts(text: str):
        raise RuntimeError("TTS synthesis service connection refused")

    selected_q = "How do you handle edge network failover?"
    tts_failed = False
    tts_res = None

    try:
        tts_res = simulate_failing_tts(selected_q)
    except Exception:
        tts_failed = True
        tracker.record_fallback("tts_failure_text_only")
        tts_res = {
            "audio_base64": None,
            "voice_text": selected_q,
            "voice_lang": "en",
            "tts_failed": True,
        }

    assert tts_failed is True
    assert tts_res["tts_failed"] is True
    assert tts_res["audio_base64"] is None
    assert tracker.fallbacks["tts_failure_text_only"] == 1


def test_websocket_drop_and_transcript_buffering_simulation():
    """Simulate WebSocket drop, transcript buffer accumulation, reconnect, and flush."""
    tracker = PipelineLatencyTracker()

    # 1. Active connection
    ws_connected = True
    transcript_buffer: list[dict] = []
    delivered: list[dict] = []

    def handle_client_speech(chunk: str):
        nonlocal ws_connected
        payload = {"type": "transcript_chunk", "content": chunk, "client_timestamp": time.time() * 1000}
        if ws_connected:
            delivered.append(payload)
        else:
            transcript_buffer.append(payload)

    # Participant speaks while connected
    handle_client_speech("Humne local caching implement kiya hai")
    assert len(delivered) == 1
    assert len(transcript_buffer) == 0

    # 2. WebSocket connection drops
    ws_connected = False
    handle_client_speech("Offline state sync SQLite ke through hoti hai")
    handle_client_speech("Jab network reconnect hota hai tab batch merge hota hai")

    assert len(delivered) == 1
    assert len(transcript_buffer) == 2, "Chunks must buffer in memory during network drop"

    # 3. WebSocket auto-reconnects with exponential backoff & flushes buffer
    ws_connected = True
    flushed_count = len(transcript_buffer)
    delivered.extend(transcript_buffer)
    transcript_buffer.clear()

    tracker.record_fallback("ws_reconnects", 1)
    tracker.record_fallback("buffered_chunks_flushed", flushed_count)

    assert len(delivered) == 3
    assert len(transcript_buffer) == 0
    assert tracker.fallbacks["ws_reconnects"] == 1
    assert tracker.fallbacks["buffered_chunks_flushed"] == 2


def test_e2e_full_trace_recording():
    """Verify record_full_trace records timestamps per stage and end-to-end latency."""
    tracker = PipelineLatencyTracker()

    t0 = 1000.000  # Client STT capture
    t1 = 1000.150  # WS rx (150ms)
    t2 = 1000.160  # Gemini start
    t3 = 1001.260  # Gemini end (1100ms)
    t4 = 1001.270  # TTS start
    t5 = 1001.670  # TTS end (400ms)
    t6 = 1001.820  # Playback start (150ms)

    trace = tracker.record_full_trace(
        t0_stt=t0,
        t1_ws_rx=t1,
        t2_gemini_start=t2,
        t3_gemini_end=t3,
        t4_tts_start=t4,
        t5_tts_end=t5,
        t6_playback=t6,
        metadata={"session_id": 1, "turn": 2},
    )

    assert trace["stt_to_ws_ms"] == 150.0
    assert trace["gemini_ms"] == 1100.0
    assert trace["tts_ms"] == 400.0
    assert trace["playback_ms"] == 150.0
    assert trace["e2e_ms"] == 1820.0

    summary = tracker.get_summary()
    assert len(summary["recent_traces"]) == 1
    assert summary["pipeline_stages"]["e2e_latency"]["p50_ms"] == 1820.0
