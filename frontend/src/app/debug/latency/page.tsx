"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  Zap,
  Volume2,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StageMetric {
  count: number;
  mean_ms: number;
  p50_ms: number;
  p95_ms: number;
  min_ms: number;
  max_ms: number;
  sla_status: "healthy" | "warning" | "degraded" | "insufficient_data";
}

interface LatencySummary {
  timestamp: number;
  pipeline_stages: Record<string, StageMetric>;
  fallbacks_triggered: {
    gemini_timeout_4s: number;
    tts_failure_text_only: number;
    ws_reconnects: number;
    buffered_chunks_flushed: number;
  };
  recent_traces: Array<{
    timestamp: number;
    stt_to_ws_ms?: number;
    gemini_ms?: number;
    tts_ms?: number;
    playback_ms?: number;
    e2e_ms?: number;
    turn?: number;
    session_id?: number;
    tts_failed?: boolean;
    async_audio_stream?: boolean;
  }>;
}

export default function LatencyDashboardPage() {
  const [data, setData] = useState<LatencySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [resetting, setResetting] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/debug/latency");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn("Could not fetch latency telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleReset = async () => {
    try {
      setResetting(true);
      await fetch("http://localhost:8000/api/debug/latency/reset", { method: "POST" });
      await fetchMetrics();
    } catch (err) {
      console.error("Reset failed", err);
    } finally {
      setResetting(false);
    }
  };

  const getSlaBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> SLA Nominal
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> SLA Elevated
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <Flame className="w-3 h-3" /> SLA Degraded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            Awaiting Data
          </span>
        );
    }
  };

  const stageDisplayNames: Record<string, { label: string; description: string; target: string }> = {
    stt_to_ws: {
      label: "STT Chunk -> WebSocket",
      description: "Speech chunk capture to WebSocket ingress",
      target: "p95 < 500ms",
    },
    gemini_duration: {
      label: "Gemini Reasoning Engine",
      description: "Provider question generation duration (4s fallback limit)",
      target: "p95 < 2000ms",
    },
    tts_duration: {
      label: "TTS Synthesis Engine",
      description: "Dual-tier speech synthesis duration",
      target: "p95 < 1000ms",
    },
    dispatch_to_playback: {
      label: "WS Dispatch -> Audio Playback",
      description: "Client packet arrival to first audio sample played",
      target: "p95 < 500ms",
    },
    e2e_latency: {
      label: "Full E2E Turnaround",
      description: "Speech finish to judge question audio playback",
      target: "p95 < 2500ms",
    },
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 selection:text-white">
      {/* Header bar */}
      <div className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  Live Pipeline Telemetry & Latency Dashboard
                </h1>
                <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/50 px-2 py-0.5 rounded font-mono">
                  DEV TOOL
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Live instrumentation: STT Chunk &rarr; WebSocket &rarr; Gemini &rarr; TTS &rarr; Playback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 hidden sm:inline">
              Refreshed: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-neutral-800 text-xs ${
                autoRefresh ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-neutral-900 text-neutral-400"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Live Polling (2s)" : "Paused"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
              className="border-neutral-800 hover:bg-red-950/30 hover:border-red-800 text-neutral-300 text-xs"
            >
              Reset Metrics
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Fallback Guards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Gemini &gt; 4s Fallback</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {data?.fallbacks_triggered?.gemini_timeout_4s ?? 0}
              </span>
              <span className="text-xs text-neutral-400">triggers</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              On-screen text displayed immediately; audio streams asynchronously
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">TTS Text-Only Fallback</span>
              <Volume2 className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {data?.fallbacks_triggered?.tts_failure_text_only ?? 0}
              </span>
              <span className="text-xs text-neutral-400">triggers</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Activated if speech synthesis fails; questions rendered as text
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">WebSocket Reconnects</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {data?.fallbacks_triggered?.ws_reconnects ?? 0}
              </span>
              <span className="text-xs text-neutral-400">reconnects</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Auto-reconnect with exponential backoff (1s &rarr; 10s max)
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Buffered Chunks Flushed</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {data?.fallbacks_triggered?.buffered_chunks_flushed ?? 0}
              </span>
              <span className="text-xs text-neutral-400">chunks</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Transcripts held in client memory buffer flushed on reconnect
            </p>
          </div>
        </div>

        {/* Pipeline Stage Latencies Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Pipeline Stage Percentiles</h2>
              <p className="text-xs text-neutral-400">
                Calculated via linear interpolation percentiles (p50 and p95 SLA targets)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stageDisplayNames).map(([stageKey, meta]) => {
              const metric = data?.pipeline_stages?.[stageKey];
              const p50 = metric ? metric.p50_ms : 0;
              const p95 = metric ? metric.p95_ms : 0;
              const count = metric ? metric.count : 0;
              const status = metric?.sla_status || "insufficient_data";
              const isE2E = stageKey === "e2e_latency";

              return (
                <div
                  key={stageKey}
                  className={`bg-neutral-950 rounded-xl p-5 border ${
                    isE2E ? "border-red-900/60 bg-red-950/10" : "border-neutral-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                        {meta.label}
                        {isE2E && <Flame className="w-3.5 h-3.5 text-red-500" />}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{meta.description}</p>
                    </div>
                    {getSlaBadge(status)}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="bg-neutral-900/80 rounded-lg p-3 border border-neutral-800/80">
                      <span className="text-[11px] uppercase font-mono tracking-wider text-neutral-400">p50 Latency</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-white">{p50}</span>
                        <span className="text-xs font-mono text-neutral-400">ms</span>
                      </div>
                    </div>

                    <div className="bg-neutral-900/80 rounded-lg p-3 border border-neutral-800/80">
                      <span className="text-[11px] uppercase font-mono tracking-wider text-neutral-400">p95 Latency</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span
                          className={`text-2xl font-bold font-mono ${
                            status === "degraded" ? "text-red-400" : status === "warning" ? "text-amber-400" : "text-white"
                          }`}
                        >
                          {p95}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
                    <span>Target: <span className="font-mono text-neutral-300">{meta.target}</span></span>
                    <span>Samples: <span className="font-mono text-neutral-300">{count}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Trace Stream Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Pipeline Execution Traces</h2>
              <p className="text-xs text-neutral-400">End-to-end breakdown per interactive round</p>
            </div>
            <span className="text-xs font-mono text-neutral-500">Last 20 requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/50 text-neutral-400 font-mono uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">STT &rarr; WS</th>
                  <th className="px-4 py-3">Gemini</th>
                  <th className="px-4 py-3">TTS Engine</th>
                  <th className="px-4 py-3">Audio Playback</th>
                  <th className="px-6 py-3">Total E2E</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50 text-neutral-300 font-mono">
                {(!data?.recent_traces || data.recent_traces.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-neutral-500 font-sans text-xs">
                      No traces recorded yet. Complete an interactive judging turn to generate live traces.
                    </td>
                  </tr>
                ) : (
                  data.recent_traces.map((trace, idx) => {
                    const isSlow = (trace.e2e_ms ?? 0) > 4000;
                    return (
                      <tr key={idx} className="hover:bg-neutral-900/40 transition">
                        <td className="px-6 py-3 text-neutral-400 font-sans">
                          {new Date(trace.timestamp * 1000).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 text-white">
                          R{trace.turn ?? 1}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {trace.stt_to_ws_ms !== undefined ? `${trace.stt_to_ws_ms}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {trace.gemini_ms !== undefined ? `${trace.gemini_ms}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {trace.tts_ms !== undefined ? `${trace.tts_ms}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {trace.playback_ms !== undefined ? `${trace.playback_ms}ms` : "—"}
                        </td>
                        <td className="px-6 py-3 font-semibold">
                          <span className={isSlow ? "text-amber-400" : "text-emerald-400"}>
                            {trace.e2e_ms !== undefined ? `${trace.e2e_ms}ms` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          {trace.tts_failed ? (
                            <span className="text-[11px] text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50">
                              TTS Fallback
                            </span>
                          ) : trace.async_audio_stream ? (
                            <span className="text-[11px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">
                              Stream Audio
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                              Nominal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}