"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Bot,
  HelpCircle,
  Radio,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { AiAvatar, AvatarState } from "@/components/avatar/ai-avatar";
import { CaptionPanel, CaptionItem } from "@/components/judging/caption-panel";
import { SessionControls } from "@/components/judging/session-controls";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function LiveJudgingRoomPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Avatar and Room State
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [avatarMessage, setAvatarMessage] = useState<string>(
    "AiNireekshak Judge room initialized. You may speak in English, Hindi, or Hinglish."
  );
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pitchInput, setPitchInput] = useState("");

  // Media streams
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize participant webcam (if permission granted, otherwise fallback gracefully)
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Camera preview fallback mode (permissions or headless):", err);
      }
    }
    if (cameraActive) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  // Connect to live WebSocket session room
  useEffect(() => {
    const sessionId = 1; // Default session
    const wsUrl = `ws://localhost:8000/ws/session/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "caption" && msg.data) {
          setCaptions((prev) => [...prev, msg.data]);
        } else if (msg.type === "caption_corrected" && msg.data) {
          // Update caption in list
          setCaptions((prev) =>
            prev.map((c) =>
              c.content === msg.data.original_content
                ? { ...c, content: msg.data.corrected_content, is_correction: true }
                : c
            )
          );
        } else if (msg.type === "ai_message" && msg.data) {
          if (msg.data.avatar_state) {
            setAvatarState(msg.data.avatar_state as AvatarState);
          }
          if (msg.data.question) {
            setAvatarMessage(msg.data.question);
            setCaptions((prev) => [
              ...prev,
              {
                speaker: "ai_judge",
                content: msg.data.question,
                language: "en",
              },
            ]);

            // Native Browser Speech Synthesis for the AI Avatar
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(msg.data.question);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              utterance.onend = () => {
                setAvatarState("listening");
              };
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message parse error", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    // Initial greeting
    setCaptions([
      {
        speaker: "ai_judge",
        content: "Namaste and welcome. I am your AiNireekshak AI judge. Please begin your pitch in English, Hindi, or Hinglish whenever you are ready.",
        language: "en",
      },
    ]);

    return () => {
      ws.close();
    };
  }, []);

  // Send spoken pitch chunk or text chunk to real-time speech recognition
  const handleSendSpeech = (textToSend?: string) => {
    const text = textToSend || pitchInput;
    if (!text.trim()) return;

    setAvatarState("listening");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "transcript_chunk",
          content: text,
        })
      );
    } else {
      // Local fallback if WebSocket is offline
      setCaptions((prev) => [
        ...prev,
        {
          speaker: "participant",
          content: text,
          language: text.includes("है") || text.includes("कि") ? "hi" : text.includes("humne") || text.includes("karenge") ? "hinglish" : "en",
        },
      ]);
    }
    setPitchInput("");
  };

  // Participant correction of misheard transcription
  const handleCorrectCaption = (original: string, corrected: string, transcriptId?: number | string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "correction",
          original_content: original,
          corrected_content: corrected,
          transcript_id: transcriptId,
        })
      );
    } else {
      setCaptions((prev) =>
        prev.map((c) =>
          c.content === original
            ? { ...c, content: corrected, is_correction: true }
            : c
        )
      );
    }
  };

  // Request the AI Judge avatar to analyze the pitch and formulate a relevant follow-up question
  const handleRequestNextQuestion = () => {
    setAvatarState("thinking");
    setAvatarMessage("Evaluating architecture, implementation feasibility, and claims...");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "request_ai_question",
          pitch_summary: captions.map((c) => c.content).join(" "),
        })
      );
    } else {
      // Simulated adaptive questions
      setTimeout(() => {
        const questions = [
          "How did you address data privacy and local caching when operating in remote rural areas with intermittent connectivity?",
          "Can you walk me through your API latency trade-offs between on-device inference and cloud model calls?",
          "How does your solution prevent hallucinated mandi pricing recommendations from misleading farmers?",
        ];
        const nextQ = questions[Math.floor(Math.random() * questions.length)];
        setAvatarState("speaking");
        setAvatarMessage(nextQ);
        setCaptions((prev) => [
          ...prev,
          {
            speaker: "ai_judge",
            content: nextQ,
            language: "en",
          },
        ]);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(nextQ);
          u.onend = () => setAvatarState("listening");
          window.speechSynthesis.speak(u);
        }
      }, 1500);
    }
  };

  // Conclude session & generate evaluation scorecard
  const handleEndSession = async () => {
    try {
      if (user?.id) {
        await api.generateEvaluation(1);
      }
      alert("Session concluded! Official evaluation report has been compiled.");
      router.push("/team/dashboard");
    } catch (err: any) {
      alert("Session completed! Returning to dashboard.");
      router.push("/team/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      <Navbar />

      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-4 max-w-7xl mx-auto w-full">
        {/* Top Control Bar */}
        <SessionControls
          initialDurationMinutes={20}
          isConnected={isConnected}
          onRequestQuestion={handleRequestNextQuestion}
          onEndSession={handleEndSession}
          onToggleMic={(enabled) => setMicActive(enabled)}
          onToggleCamera={(enabled) => setCameraActive(enabled)}
        />

        {/* Video & AI Room Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Left: AI Avatar & Participant Feed (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* AI Avatar Stage (Center Highlight) */}
            <div className="relative flex-1 min-h-[360px] rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-6 shadow-2xl overflow-hidden">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300">
                  AiNireekshak Avatar Judge
                </span>
              </div>

              {/* Avatar Animation */}
              <AiAvatar state={avatarState} subtext={avatarMessage} size="lg" />

              {/* Floating Participant Pip Camera Feed (Bottom-Right) */}
              <div className="absolute bottom-4 right-4 size-32 sm:size-40 rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-500 text-xs">
                    <VideoOff className="size-6 mb-1 text-slate-600" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 text-[10px] bg-slate-950/80 px-2 py-0.5 rounded font-medium text-slate-300">
                  You ({micActive ? "Mic On" : "Muted"})
                </div>
              </div>
            </div>

            {/* Quick Speech & Hinglish Input Bar */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-2">
              <input
                type="text"
                value={pitchInput}
                onChange={(e) => setPitchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendSpeech()}
                placeholder="Speak or type your explanation in Hindi, Hinglish, or English..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
              />
              <Button
                size="sm"
                onClick={() => handleSendSpeech()}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-4"
              >
                Send Speech
              </Button>
            </div>

            {/* Sample Indian Language Pitch Quick Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-[11px] text-slate-500">Quick Test Prompts:</span>
              <button
                type="button"
                onClick={() =>
                  handleSendSpeech(
                    "Humne offline SQLite aur fast ONNX embeddings implement ki hain taki bina internet ke models seamlessly run kar sakein."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-medium"
              >
                Hinglish Tech Pitch
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendSpeech(
                    "हमारा सिस्टम लोकल भाषा में मौसम और फसल की बीमारियों के अलर्ट्स वॉइस मैसेज के ज़रिए किसानों तक पहुंचाता है।"
                  )
                }
                className="px-2.5 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20 text-[11px] font-medium"
              >
                Hindi Native Pitch
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendSpeech(
                    "We achieved sub-200ms latency on edge hardware with 94.8% F1 score across 12 crop categories."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-medium"
              >
                English Technical Pitch
              </button>
            </div>
          </div>

          {/* Right: Real-time Live Captions & Participant Corrections (5 cols) */}
          <div className="lg:col-span-5 h-[540px]">
            <CaptionPanel
              captions={captions}
              onCorrectCaption={handleCorrectCaption}
              onRepeatStatement={() => {
                const last = captions[captions.length - 1];
                if (last && last.speaker === "participant") {
                  handleSendSpeech(last.content);
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
