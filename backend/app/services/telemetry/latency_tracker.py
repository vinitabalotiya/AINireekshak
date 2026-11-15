"""Live Pipeline Latency & Telemetry Tracker.

Instruments the full interactive pipeline:
STT chunk -> WebSocket -> Gemini -> TTS -> Playback
Computes p50 and p95 latency percentiles per stage and tracks fallback activations.
"""

from __future__ import annotations

import math
import time
from collections import deque
from typing import Any


def calculate_percentile(data: list[float], percentile: float) -> float:
    """Calculate the given percentile (e.g. 50.0 for p50, 95.0 for p95) using linear interpolation."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    n = len(sorted_data)
    if n == 1:
        return sorted_data[0]

    # Rank formula
    k = (percentile / 100.0) * (n - 1)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return round(sorted_data[int(k)], 2)
    d0 = sorted_data[f] * (c - k)
    d1 = sorted_data[c] * (k - f)
    return round(d0 + d1, 2)


class PipelineLatencyTracker:
    """Singleton tracker for pipeline latency metrics and SLA compliance."""

    def __init__(self, max_history: int = 1000) -> None:
        self.max_history = max_history

        # Latency buffers (in milliseconds)
        self.stages: dict[str, deque[float]] = {
            "stt_to_ws": deque(maxlen=max_history),
            "gemini_duration": deque(maxlen=max_history),
            "tts_duration": deque(maxlen=max_history),
            "dispatch_to_playback": deque(maxlen=max_history),
            "e2e_latency": deque(maxlen=max_history),
        }

        # Fallback counters
        self.fallbacks: dict[str, int] = {
            "gemini_timeout_4s": 0,
            "tts_failure_text_only": 0,
            "ws_reconnects": 0,
            "buffered_chunks_flushed": 0,
        }

        # Recent trace records
        self.traces: deque[dict[str, Any]] = deque(maxlen=100)

    def record_stage(self, stage_name: str, duration_ms: float, metadata: dict[str, Any] | None = None) -> None:
        """Record duration in ms for a specific pipeline stage."""
        val = max(0.0, round(float(duration_ms), 2))
        if stage_name in self.stages:
            self.stages[stage_name].append(val)
        else:
            self.stages[stage_name] = deque([val], maxlen=self.max_history)

        if metadata:
            trace_entry = {
                "timestamp": time.time(),
                "stage": stage_name,
                "duration_ms": val,
                **metadata,
            }
            self.traces.append(trace_entry)

    def record_full_trace(
        self,
        t0_stt: float | None,
        t1_ws_rx: float,
        t2_gemini_start: float,
        t3_gemini_end: float,
        t4_tts_start: float,
        t5_tts_end: float,
        t6_playback: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, float]:
        """Record an end-to-end request trace across all 5 pipeline stages."""
        meta = metadata or {}

        # 1. STT -> WS latency
        stt_latency = 0.0
        if t0_stt and t1_ws_rx >= t0_stt:
            stt_latency = (t1_ws_rx - t0_stt) * 1000.0
            self.record_stage("stt_to_ws", stt_latency)

        # 2. Gemini latency
        gemini_latency = max(0.0, (t3_gemini_end - t2_gemini_start) * 1000.0)
        self.record_stage("gemini_duration", gemini_latency)

        # 3. TTS latency
        tts_latency = max(0.0, (t5_tts_end - t4_tts_start) * 1000.0)
        self.record_stage("tts_duration", tts_latency)

        # 4. Playback latency (from TTS ready to client audio playback)
        playback_latency = 0.0
        if t6_playback and t6_playback >= t5_tts_end:
            playback_latency = (t6_playback - t5_tts_end) * 1000.0
            self.record_stage("dispatch_to_playback", playback_latency)

        # 5. Total E2E latency
        start_anchor = t0_stt or t1_ws_rx
        end_anchor = t6_playback or t5_tts_end
        e2e_latency = max(0.0, (end_anchor - start_anchor) * 1000.0)
        self.record_stage("e2e_latency", e2e_latency)

        trace_summary = {
            "timestamp": time.time(),
            "stt_to_ws_ms": round(stt_latency, 2),
            "gemini_ms": round(gemini_latency, 2),
            "tts_ms": round(tts_latency, 2),
            "playback_ms": round(playback_latency, 2),
            "e2e_ms": round(e2e_latency, 2),
            **meta,
        }
        self.traces.append(trace_summary)
        return trace_summary

    def record_fallback(self, fallback_key: str, count: int = 1) -> None:
        """Increment count for a triggered fallback mechanism."""
        if fallback_key in self.fallbacks:
            self.fallbacks[fallback_key] += count
        else:
            self.fallbacks[fallback_key] = count

    def get_summary(self) -> dict[str, Any]:
        """Compute p50 and p95 metrics across all stages."""
        stage_metrics: dict[str, Any] = {}

        for stage, buffer in self.stages.items():
            vals = list(buffer)
            if not vals:
                stage_metrics[stage] = {
                    "count": 0,
                    "mean_ms": 0.0,
                    "p50_ms": 0.0,
                    "p95_ms": 0.0,
                    "min_ms": 0.0,
                    "max_ms": 0.0,
                    "sla_status": "insufficient_data",
                }
                continue

            mean_val = round(sum(vals) / len(vals), 2)
            p50_val = calculate_percentile(vals, 50.0)
            p95_val = calculate_percentile(vals, 95.0)

            # Determine SLA health status:
            # E2E SLA: Target p95 < 2500ms; Warning: 2500-4000ms; Critical: > 4000ms
            if stage == "e2e_latency":
                sla_status = "healthy" if p95_val <= 2500 else "warning" if p95_val <= 4000 else "degraded"
            elif stage == "gemini_duration":
                sla_status = "healthy" if p95_val <= 2000 else "warning" if p95_val <= 4000 else "degraded"
            elif stage == "tts_duration":
                sla_status = "healthy" if p95_val <= 1000 else "warning" if p95_val <= 2000 else "degraded"
            else:
                sla_status = "healthy" if p95_val <= 500 else "warning"

            stage_metrics[stage] = {
                "count": len(vals),
                "mean_ms": mean_val,
                "p50_ms": p50_val,
                "p95_ms": p95_val,
                "min_ms": min(vals),
                "max_ms": max(vals),
                "sla_status": sla_status,
            }

        return {
            "timestamp": time.time(),
            "pipeline_stages": stage_metrics,
            "fallbacks_triggered": self.fallbacks,
            "recent_traces": list(self.traces)[-20:],
        }

    def reset(self) -> None:
        """Reset all metrics and buffers."""
        for buf in self.stages.values():
            buf.clear()
        for k in self.fallbacks:
            self.fallbacks[k] = 0
        self.traces.clear()


# Global singleton instance
latency_tracker = PipelineLatencyTracker()
