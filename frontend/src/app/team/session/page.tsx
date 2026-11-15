"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Bot,
  Radio,
  FlipHorizontal,
  AlertTriangle,
  CheckCircle2,
  Languages,
  UploadCloud,
  ShieldCheck,
  Volume2,
  VolumeX,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/layout/navbar";
import { AiAvatar, AvatarState } from "@/components/avatar/ai-avatar";
import { RollingCaptionBox, CaptionEntry } from "@/components/judging/rolling-caption-box";
import { AudioPreflightModal } from "@/components/judging/audio-preflight-modal";
import { SessionControls } from "@/components/judging/session-controls";
import { LivenessOverlay, LivenessChallenge } from "@/components/judging/liveness-overlay";
import { useBehaviourDetection } from "@/hooks/use-behaviour-detection";
import {
  initializeGestureRecognizer,
  recognizeGesture,
  captureVideoSnapshot,
  estimateFrameLuminance,
} from "@/services/mediapipe-vision";
import { transliterateToHinglish, hasDevanagari } from "@/lib/hinglish-transliteration";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function LiveJudgingRoomPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Audio Preflight & Unlock Modal (Autoplay policy satisfaction)
  const [showPreflightModal, setShowPreflightModal] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);

  // Avatar and Room State
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const avatarStateRef = useRef<AvatarState>("idle");
  useEffect(() => {
    avatarStateRef.current = avatarState;
  }, [avatarState]);

  const [avatarMessage, setAvatarMessage] = useState<string>(
    "AiNireekshak Judge room initialized. You may speak in English, Hindi, or Hinglish."
  );
  const [isConnected, setIsConnected] = useState(false);
  const [pitchInput, setPitchInput] = useState("");

  // TASK 1: Rolling 2-Line Caption Buffer (Strictly at most 2 lines in state & DOM)
  const [captionLines, setCaptionLines] = useState<CaptionEntry[]>([]);

  // Separate non-rendered full transcript store for evaluation & organiser view
  const fullTranscriptRef = useRef<
    Array<{
      id: string | number;
      speaker: string;
      content: string;
      language: string;
      timestamp: number;
      turn?: number;
    }>
  >([]);

  // Active audio player instance for barge-in cancellation
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Camera settings
  const [cameraActive, setCameraActive] = useState(true);
  const [flipCamera, setFlipCamera] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Silent MediaPipe Vision (Task 3: completely invisible to participant)
  const {
    metrics: behaviourMetrics,
    getSessionSummary,
  } = useBehaviourDetection({
    videoRef,
    enabled: cameraActive,
    showMesh: false,
    isMirrored: flipCamera,
  });

  // Liveness anti-replay challenge state (Task 1)
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<"idle" | "active" | "passed" | "missed" | "errored">("idle");
  const [challengeProgressMs, setChallengeProgressMs] = useState(0);
  const activeChallengeRef = useRef<LivenessChallenge | null>(null);
  const challengeStartTimeRef = useRef<number>(0);
  const gestureHeldStartRef = useRef<number | null>(null);
  const headTurnPhaseRef = useRef<"center" | "turned" | "returned">("center");
  const headTurnStartTimeRef = useRef<number | null>(null);

  // In-Browser Voice Recording & Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const interimTranscriptRef = useRef<string>("");
  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);
  const lastSpeechEndTimeRef = useRef<number>(0);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef<any[]>([]);
  const [speechLang, setSpeechLang] = useState<"hi" | "en" | "hinglish">("hi");
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // VAD Silence timer (1.8s pause triggers auto-send & follow-up)
  const vadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Watchdog timer (20s timeout to reset stuck avatar)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // PPT Upload/Analysis verification & Pitch Phase Management
  const [pptStatus, setPptStatus] = useState<{
    hasPpt: boolean;
    isAnalyzed: boolean;
    filename?: string;
  }>({ hasPpt: false, isAnalyzed: false });
  const [checkingPpt, setCheckingPpt] = useState(true);
  const [sessionPhase, setSessionPhase] = useState<"prep" | "pitching" | "qa">("prep");
  const [pitchDelivered, setPitchDelivered] = useState(false);

  // Helper to map 3 supported languages to browser Web Speech BCP 47 codes
  const getRecognitionLangCode = (lang: "hi" | "en" | "hinglish") => {
    switch (lang) {
      case "en":
        return "en-IN";
      case "hinglish":
        return "hi-IN"; // hi-IN captures Indian speech phonology
      case "hi":
      default:
        return "hi-IN";
    }
  };

  // Helper: Append line to 2-line rolling buffer (maintains strictly <= 2 in DOM)
  const pushToCaptionBuffer = useCallback((newEntry: CaptionEntry) => {
    setCaptionLines((prev) => {
      // If previous last entry was interim for participant, replace it
      if (prev.length > 0 && prev[prev.length - 1].isInterim && newEntry.speaker === "participant") {
        const updated = [...prev.slice(0, -1), newEntry];
        return updated.slice(-2);
      }
      const updated = [...prev, newEntry];
      return updated.slice(-2);
    });
  }, []);

  // Unlock AudioContext & pre-warm voices
  const unlockAudioContext = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
        window.speechSynthesis.getVoices();
      }
      setAudioUnlocked(true);
    } catch (e) {
      console.warn("Audio unlock notice:", e);
    }
  }, []);

  // Voice playback handler: Backend Audio bytes -> browser SpeechSynthesis -> Chime notice
  const playJudgeVoice = useCallback((
    text: string,
    audioBase64?: string,
    voiceLang: string = "en",
    voiceText?: string,
    t5DispatchTime?: number
  ) => {
    // Stop any existing playing audio (barge-in / reset)
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (e) {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setAvatarState("speaking");

    // Tier 1: High-fidelity synthesized audio bytes from backend
    if (audioBase64 && audioBase64.startsWith("data:audio")) {
      try {
        const audio = new Audio(audioBase64);
        audio.volume = 1.0;
        activeAudioRef.current = audio;

        audio.onplay = () => {
          setTtsNotice(null);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && t5DispatchTime) {
            wsRef.current.send(
              JSON.stringify({
                type: "playback_started",
                t5_dispatch_time: t5DispatchTime,
                client_playback_timestamp: Date.now() / 1000.0,
              })
            );
          }
        };

        audio.onended = () => {
          setAvatarState("listening");
          activeAudioRef.current = null;
        };

        audio.onerror = (err) => {
          console.warn("Audio byte decode error, falling back to browser SpeechSynthesis:", err);
          activeAudioRef.current = null;
          fallbackToSpeechSynthesis(voiceText || text, voiceLang, t5DispatchTime);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.warn("Audio play rejected, falling back to SpeechSynthesis:", playErr);
            fallbackToSpeechSynthesis(voiceText || text, voiceLang, t5DispatchTime);
          });
        }
        return;
      } catch (audioErr) {
        console.warn("Audio constructor failed:", audioErr);
      }
    }

    // Tier 2: Browser Native SpeechSynthesis
    fallbackToSpeechSynthesis(voiceText || text, voiceLang, t5DispatchTime);
  }, []);

  // Browser SpeechSynthesis fallback with persistent ref & voice matching
  const fallbackToSpeechSynthesis = (spokenText: string, langCode: string, t5DispatchTime?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsNotice("Judge voice unavailable on this browser (visual captions active)");
      setAvatarState("listening");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = langCode === "hi" ? "hi-IN" : "en-IN";

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matched = voices.find((v) =>
          langCode === "hi"
            ? v.lang.includes("hi") || v.name.toLowerCase().includes("hindi")
            : v.lang.includes("en-IN") || v.lang.includes("en-US")
        );
        if (matched) utterance.voice = matched;
      }

      utterance.onstart = () => {
        setTtsNotice(null);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && t5DispatchTime) {
          wsRef.current.send(
            JSON.stringify({
              type: "playback_started",
              t5_dispatch_time: t5DispatchTime,
              client_playback_timestamp: Date.now() / 1000.0,
            })
          );
        }
      };

      utterance.onend = () => {
        setAvatarState("listening");
        (window as any).__activeUtterance = null;
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis utterance error:", e);
        setTtsNotice("Judge voice playback notice (visual captions active)");
        setAvatarState("listening");
        (window as any).__activeUtterance = null;
      };

      // Chromium bug protection: store in global to prevent V8 garbage collection mid-speech
      (window as any).__activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (speechErr) {
      console.warn("SpeechSynthesis fallback exception:", speechErr);
      setTtsNotice("Judge voice playback unavailable (visual captions active)");
      setAvatarState("listening");
    }
  };

  // Pre-load gesture recognizer on mount
  useEffect(() => {
    initializeGestureRecognizer().catch((e) => console.debug("Gesture recognizer preload notice:", e));
  }, []);

  // Check PPT upload readiness on mount
  useEffect(() => {
    async function checkPptReadiness() {
      if (!user?.id) return;
      try {
        setCheckingPpt(true);
        const submissions = await api.getTeamSubmissions(user.id);
        const subList = Array.isArray(submissions) ? submissions : (submissions?.items || []);
        const ppt = subList.find((s: any) => s.submission_type === "presentation" || s.submission_type === "document");

        if (ppt) {
          const isAnalyzed = ppt.status === "analyzed";
          setPptStatus({
            hasPpt: true,
            isAnalyzed,
            filename: ppt.original_filename || "Presentation Deck",
          });
          if (isAnalyzed) {
            setSessionPhase("pitching");
            setAvatarState("listening");
            setAvatarMessage(
              "Presentation deck verified. Ready for your live pitch in Hindi, Hinglish, or English."
            );
          } else {
            setSessionPhase("pitching");
            setAvatarState("listening");
            setAvatarMessage("Presentation deck uploaded. Proceed with your pitch.");
          }
        } else {
          setPptStatus({ hasPpt: false, isAnalyzed: false });
          setSessionPhase("pitching");
          setAvatarState("listening");
          setAvatarMessage("Welcome! Deliver your project overview and architecture in Hindi, Hinglish, or English.");
        }
      } catch (err) {
        console.error("Failed to check PPT readiness", err);
      } finally {
        setCheckingPpt(false);
      }
    }
    checkPptReadiness();
  }, [user]);

  // Initialize webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Camera fallback mode:", err);
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

  // Connect to live WebSocket session room with auto-reconnect and transcript buffering
  useEffect(() => {
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const paramSessionId = searchParams?.get("session_id");
      const sessionId = paramSessionId || user?.id || 1;
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const wsUrl = `ws://${host}:8000/ws/session/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Flush any buffered transcript chunks accumulated during disconnect
        if (transcriptBufferRef.current.length > 0) {
          const buffered = [...transcriptBufferRef.current];
          transcriptBufferRef.current = [];
          buffered.forEach((chunk) => {
            try {
              ws.send(JSON.stringify(chunk));
            } catch (flushErr) {
              console.warn("Could not send buffered transcript chunk:", flushErr);
            }
          });
          try {
            ws.send(
              JSON.stringify({
                type: "ws_reconnected",
                flushed_count: buffered.length,
              })
            );
          } catch (e) {}
        } else if (reconnectAttemptRef.current > 0) {
          try {
            ws.send(
              JSON.stringify({
                type: "ws_reconnected",
                flushed_count: 0,
              })
            );
          } catch (e) {}
        }
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // A. Live captions from participant
          if (msg.type === "caption" && msg.data) {
            if (msg.data.speaker === "participant") {
              const displayTxt =
                speechLang === "hinglish"
                  ? transliterateToHinglish(msg.data.content)
                  : msg.data.content;

              pushToCaptionBuffer({
                id: `p_${Date.now()}_${Math.random()}`,
                speaker: "participant",
                text: displayTxt,
                isInterim: false,
                timestamp: Date.now(),
              });

              fullTranscriptRef.current.push({
                id: msg.data.id || fullTranscriptRef.current.length + 1,
                speaker: "participant",
                content: displayTxt,
                language: speechLang,
                timestamp: Date.now(),
              });
            }
          }

          // B. Presence Verification Challenge dispatched by backend
          else if (msg.type === "liveness_challenge" && msg.challenge) {
            const chal: LivenessChallenge = msg.challenge;

            const activateChallengeNow = () => {
              setCurrentChallenge(chal);
              activeChallengeRef.current = chal;
              setChallengeStatus("active");
              setChallengeProgressMs(0);
              challengeStartTimeRef.current = Date.now();
              gestureHeldStartRef.current = null;
              headTurnPhaseRef.current = "center";
              headTurnStartTimeRef.current = null;

              const i18n = chal as any;
              const promptVoice =
                speechLang === "hi"
                  ? i18n?.i18n?.hi || chal.prompt
                  : speechLang === "hinglish"
                  ? i18n?.i18n?.hinglish || chal.prompt
                  : i18n?.i18n?.en || chal.prompt;

              playJudgeVoice(promptVoice, undefined, speechLang === "hi" ? "hi" : "en", promptVoice);
            };

            // VAD pause enforcement: never trigger during active speech (wait for pause of 400ms or more)
            const isSpeakingNow =
              interimTranscriptRef.current.trim().length > 0 ||
              Date.now() - lastSpeechEndTimeRef.current < 400;

            if (isSpeakingNow) {
              const vadCheckInterval = setInterval(() => {
                const silence = Date.now() - lastSpeechEndTimeRef.current;
                if (!interimTranscriptRef.current.trim() && silence >= 400) {
                  clearInterval(vadCheckInterval);
                  activateChallengeNow();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(vadCheckInterval);
                if (!activeChallengeRef.current) {
                  activateChallengeNow();
                }
              }, 15000);
            } else {
              activateChallengeNow();
            }
          }

          // C. AI Judge Question & Voice Output
          else if (msg.type === "ai_message" && msg.data) {
            if (msg.data.avatar_state) {
              setAvatarState(msg.data.avatar_state as AvatarState);
            }
            if (msg.data.message && !msg.data.question) {
              setAvatarMessage(msg.data.message);
            }
            if (msg.data.question) {
              const judgeQuestion = msg.data.question;
              setAvatarMessage(judgeQuestion);
              setSessionPhase("qa");

              // Format question for caption buffer (strictly Roman in Hinglish)
              const captionQuestion =
                speechLang === "hinglish"
                  ? transliterateToHinglish(judgeQuestion)
                  : judgeQuestion;

              pushToCaptionBuffer({
                id: `judge_${Date.now()}`,
                speaker: "judge",
                text: captionQuestion,
                isInterim: false,
                timestamp: Date.now(),
              });

              fullTranscriptRef.current.push({
                id: `ai_${Date.now()}`,
                speaker: "ai_judge",
                content: captionQuestion,
                language: speechLang,
                timestamp: Date.now(),
                turn: msg.data.turn,
              });

              // Fallback 1: If text_only_interim (Gemini took > 4s), show on-screen text immediately and wait for audio stream
              if (msg.data.text_only_interim) {
                setAvatarState("speaking");
                return;
              }

              // Fallback 2: If TTS failed on backend, display text only with notice
              if (msg.data.tts_failed) {
                setTtsNotice("Voice playback unavailable: text captions active");
                setAvatarState("listening");
                return;
              }

              // Normal flow: Play voice output via dual-engine TTS
              playJudgeVoice(
                judgeQuestion,
                msg.data.audio_base64,
                msg.data.voice_lang || (speechLang === "hi" ? "hi" : "en"),
                msg.data.voice_text,
                msg.data.t5_dispatch_time
              );
            }
          }

          // D. Asynchronous AI Audio Stream (when Gemini took >4s and TTS finishes later)
          else if (msg.type === "ai_audio_stream") {
            const currentQ = msg.question || avatarMessage;
            if (msg.audio_base64) {
              playJudgeVoice(
                currentQ,
                msg.audio_base64,
                msg.voice_lang || (speechLang === "hi" ? "hi" : "en"),
                msg.voice_text || currentQ,
                msg.t5_dispatch_time
              );
            }
          }
        } catch (err) {
          console.error("WebSocket message parse error", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (isUnmounted) return;
        // Auto-reconnect with exponential backoff (1s, 1.5s, 2.25s, max 10s)
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(10000, Math.round(1000 * Math.pow(1.5, attempt)));
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket transport error:", err);
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [user, speechLang, playJudgeVoice, pushToCaptionBuffer, avatarMessage]);

  // 4. Liveness Challenge Verification Loop
  useEffect(() => {
    if (challengeStatus !== "active" || !currentChallenge) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - challengeStartTimeRef.current;
      setChallengeProgressMs(elapsed);

      if (elapsed >= 5000) {
        setChallengeStatus("missed");
        const lum = videoRef.current
          ? estimateFrameLuminance(videoRef.current)
          : { meanLuminance: 120.0, lightingQuality: "optimal" as const };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeChallengeRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "challenge_response",
              challengeId: activeChallengeRef.current.id,
              nonce: activeChallengeRef.current.nonce,
              passed: false,
              faceDetected: behaviourMetrics.faceDetected,
              responseTimeMs: 5000,
              meanLuminance: lum.meanLuminance,
              lightingQuality: lum.lightingQuality,
            })
          );
        }
        setTimeout(() => {
          setChallengeStatus("idle");
          setCurrentChallenge(null);
          activeChallengeRef.current = null;
        }, 1500);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || !behaviourMetrics.faceDetected) return;

      const chalType = currentChallenge.type.toLowerCase();

      // Hand Gestures
      if (chalType.includes("palm") || chalType.includes("thumb") || chalType.includes("victory")) {
        const gestureResult = recognizeGesture(video, now);
        const gName = gestureResult.gesture.toLowerCase();
        let isMatch = false;

        if (chalType.includes("palm") && gName.includes("palm")) isMatch = true;
        if (chalType.includes("thumb") && gName.includes("thumb")) isMatch = true;
        if (chalType.includes("victory") && gName.includes("victory")) isMatch = true;

        if (isMatch && gestureResult.confidence >= 0.7) {
          if (!gestureHeldStartRef.current) {
            gestureHeldStartRef.current = now;
          } else if (now - gestureHeldStartRef.current >= 500) {
            handleLivenessPass(gestureResult.gesture, gestureResult.confidence, elapsed);
          }
        } else {
          gestureHeldStartRef.current = null;
        }
      }
      // Head Turns
      else if (chalType.includes("left") || chalType.includes("right")) {
        const yaw = behaviourMetrics.headPose.yaw;
        const isLeft = chalType.includes("left");
        const effectiveYaw = flipCamera ? -yaw : yaw;

        if (headTurnPhaseRef.current === "center") {
          const reachedTurn = isLeft ? effectiveYaw <= -20 : effectiveYaw >= 20;
          if (reachedTurn) {
            if (!headTurnStartTimeRef.current) {
              headTurnStartTimeRef.current = now;
            } else if (now - headTurnStartTimeRef.current >= 300) {
              headTurnPhaseRef.current = "turned";
            }
          } else {
            headTurnStartTimeRef.current = null;
          }
        } else if (headTurnPhaseRef.current === "turned") {
          if (Math.abs(effectiveYaw) < 10) {
            handleLivenessPass(`Turned ${isLeft ? "LEFT" : "RIGHT"} & returned`, 1.0, elapsed, yaw);
          }
        }
      }
    }, 70);

    return () => clearInterval(interval);
  }, [challengeStatus, currentChallenge, behaviourMetrics, flipCamera]);

  const handleLivenessPass = (detectedLabel: string, conf: number, responseTimeMs: number, yawVal?: number) => {
    if (!activeChallengeRef.current || challengeStatus !== "active") return;

    setChallengeStatus("passed");
    const snapshot = videoRef.current ? captureVideoSnapshot(videoRef.current, 320) : "";
    const lum = videoRef.current
      ? estimateFrameLuminance(videoRef.current)
      : { meanLuminance: 120.0, lightingQuality: "optimal" as const };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "challenge_response",
          challengeId: activeChallengeRef.current.id,
          nonce: activeChallengeRef.current.nonce,
          passed: true,
          detected: detectedLabel,
          confidence: conf,
          yaw: yawVal,
          faceDetected: true,
          responseTimeMs: Math.round(responseTimeMs),
          meanLuminance: lum.meanLuminance,
          lightingQuality: lum.lightingQuality,
          snapshot,
        })
      );
    }

    setTimeout(() => {
      setChallengeStatus("idle");
      setCurrentChallenge(null);
      activeChallengeRef.current = null;
    }, 1500);
  };

  // 5. In-Browser Continuous Speech Recognition (Web Speech API) with VAD & Barge-in
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    let recognition: any = null;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLangCode(speechLang);

      recognition.onstart = () => {
        setIsListening(true);
      };

      // Zero-latency barge-in: stop judge speech immediately (< 100ms) when participant starts speaking
      recognition.onspeechstart = () => {
        lastSpeechEndTimeRef.current = 0;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: "speech_status", is_speaking: true }));
          } catch (e) {}
        }
        if (avatarStateRef.current === "speaking") {
          if (activeAudioRef.current) {
            try {
              activeAudioRef.current.pause();
              activeAudioRef.current = null;
            } catch (e) {}
          }
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          setAvatarState("listening");
        }
      };

      recognition.onspeechend = () => {
        lastSpeechEndTimeRef.current = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: "speech_status", is_speaking: false }));
          } catch (e) {}
        }
      };

      recognition.onresult = (event: any) => {
        // Zero-latency barge-in check
        if (avatarStateRef.current === "speaking") {
          if (activeAudioRef.current) {
            try {
              activeAudioRef.current.pause();
              activeAudioRef.current = null;
            } catch (e) {}
          }
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          setAvatarState("listening");
        }

        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const finalClean = transcript.trim();
            if (finalClean) {
              handleSendSpeech(finalClean);
              setPitchDelivered(true);
            }
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          // Task 2: In Hinglish mode, transliterate interim speech immediately
          const cleanInterim =
            speechLang === "hinglish"
              ? transliterateToHinglish(interim)
              : interim;

          setInterimTranscript(cleanInterim);

          // Update active line in rolling 2-line caption buffer in place
          pushToCaptionBuffer({
            id: "interim_line",
            speaker: "participant",
            text: cleanInterim,
            isInterim: true,
            timestamp: Date.now(),
          });

          // Task 3: 1.8s Silence VAD trigger automatically finalizes speech & requests follow-up
          if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
          vadTimerRef.current = setTimeout(() => {
            if (cleanInterim.trim() && avatarStateRef.current !== "speaking") {
              handleSendSpeech(cleanInterim.trim());
              setInterimTranscript("");

              // Auto-trigger follow-up question after silence without requiring manual clicks
              setTimeout(() => {
                triggerAutoAiQuestion();
              }, 400);
            }
          }, 1800);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (micActive && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;

      if (micActive) {
        try {
          recognition.start();
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not initialize SpeechRecognition:", err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
    };
  }, [micActive, speechLang, pushToCaptionBuffer]);

  // 20s Watchdog timer: automatically recover avatar if stuck
  useEffect(() => {
    if (avatarState === "thinking" || avatarState === "speaking") {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = setTimeout(() => {
        if (avatarStateRef.current === "thinking" || avatarStateRef.current === "speaking") {
          console.info("Watchdog reset avatar to listening state");
          setAvatarState("listening");
        }
      }, 20000);
    }
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [avatarState]);

  // Send spoken pitch chunk or text chunk to real-time speech recognition
  const handleSendSpeech = (textToSend?: string) => {
    const rawText = textToSend || pitchInput;
    if (!rawText.trim()) return;

    // Acoustic Echo Suppression: Ignore input if avatar is speaking
    if (avatarStateRef.current === "speaking") return;

    // Task 2: Ensure strictly Roman Latin in Hinglish mode
    let text = rawText.trim();
    if (speechLang === "hinglish") {
      text = transliterateToHinglish(text);
      if (hasDevanagari(text)) {
        text = text.replace(/[\u0900-\u097F]/g, "");
      }
    }

    setAvatarState("listening");
    setPitchDelivered(true);

    // Push finalized text to 2-line caption buffer
    pushToCaptionBuffer({
      id: `p_final_${Date.now()}`,
      speaker: "participant",
      text,
      isInterim: false,
      timestamp: Date.now(),
    });

    // Store in non-rendered full transcript store
    fullTranscriptRef.current.push({
      id: fullTranscriptRef.current.length + 1,
      speaker: "participant",
      content: text,
      language: speechLang,
      timestamp: Date.now(),
    });

    const chunkPayload = {
      type: "transcript_chunk",
      content: text,
      language: speechLang,
      team_id: user?.id,
      client_timestamp: Date.now(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(chunkPayload));
    } else {
      // Buffer transcript while WebSocket is reconnecting
      transcriptBufferRef.current.push(chunkPayload);
    }

    setPitchInput("");
    setInterimTranscript("");
  };

  // Automated follow-up question trigger (called after 1.8s silence pause or manual button click)
  const triggerAutoAiQuestion = (force: boolean = false) => {
    if (force) {
      // Immediate barge-in: stop any running audio synthesis
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        } catch (e) {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    } else {
      if (avatarStateRef.current === "speaking" || avatarStateRef.current === "thinking") return;
    }

    const participantLines = fullTranscriptRef.current.filter((t) => t.speaker === "participant");
    // If auto-triggered by VAD silence, require at least some spoken input or uploaded deck; if manual button click (force), proceed immediately
    if (!force && participantLines.length === 0 && !pptStatus.hasPpt) return;

    const combinedPitch = participantLines.map((t) => t.content).join(" ");
    setAvatarState("thinking");
    setAvatarMessage("Analyzing presentation deck & formulating technical inquiry...");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "request_ai_question",
          team_id: user?.id,
          pitch_summary: combinedPitch,
          language: speechLang,
          behaviour_summary: getSessionSummary(),
          force: force,
          client_timestamp: Date.now(),
        })
      );
    }
  };

  // Manual trigger button for Q&A transition: always forces immediate AI question grounded in PPT
  const handleRequestNextQuestion = () => {
    unlockAudioContext();
    triggerAutoAiQuestion(true);
  };

  // Transmit real-time behavior telemetry silently over WebSocket every 4s
  useEffect(() => {
    if (!isConnected || !wsRef.current || !behaviourMetrics.faceDetected) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "behaviour_telemetry",
            telemetry: {
              eye_contact_score: behaviourMetrics.eyeContactScore,
              attention_score: behaviourMetrics.attentionScore,
              confidence_score: behaviourMetrics.confidenceScore,
              orientation: behaviourMetrics.headPose.orientation,
              pitch: behaviourMetrics.headPose.pitch,
              yaw: behaviourMetrics.headPose.yaw,
              is_speaking: behaviourMetrics.isSpeaking,
              is_smiling: behaviourMetrics.isSmiling,
              delivery_status: behaviourMetrics.deliveryStatus,
            },
          })
        );
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isConnected, behaviourMetrics]);

  // Timer expiration state
  const [isTimeUp, setIsTimeUp] = useState(false);

  // "Presentation Submitted" Pop-up Modal State
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(8);

  useEffect(() => {
    if (!showSubmittedModal) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/team/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showSubmittedModal, router]);

  // Conclude session & show presentation submitted modal
  const handleEndSession = async () => {
    try {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const paramSessionId = searchParams?.get("session_id");
      const currentSessionId = paramSessionId ? parseInt(paramSessionId) : (user?.id ? Number(user.id) : 1);

      // Clean up speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }

      // Clean up camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {}
      }

      // Stop active audio
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        } catch (e) {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      // Signal session termination over WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "session_end" }));
          wsRef.current.close();
        } catch (e) {}
      }

      // Update session status and trigger AI evaluation asynchronously
      try {
        await api.updateSessionStatus(currentSessionId, "completed");
      } catch (statusErr) {
        console.debug("Session completion update notice:", statusErr);
      }

      try {
        await api.generateEvaluation(currentSessionId);
      } catch (evalErr) {
        console.debug("Evaluation generation notice:", evalErr);
      }

      setShowSubmittedModal(true);
      setRedirectCountdown(8);
    } catch (err: any) {
      console.warn("End session handled, displaying completion popup:", err);
      setShowSubmittedModal(true);
      setRedirectCountdown(8);
    }
  };

  // Handle 3-minute presentation timer ending automatically
  const handleTimeUp = async () => {
    if (isTimeUp) return;
    setIsTimeUp(true);
    setAvatarState("idle");
    setAvatarMessage("3-minute presentation timer reached. Concluding session & compiling evaluation scorecard...");

    // Stop active audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (e) {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const timeUpMsg =
      speechLang === "hi"
        ? "प्रस्तुति का 3 मिनट का समय पूरा हो चुका है। मूल्यांकन स्कोरकार्ड तैयार किया जा रहा है।"
        : speechLang === "hinglish"
        ? "3 minutes ka presentation time complete ho gaya hai. Final evaluation scorecard generate ho raha hai."
        : "The 3-minute presentation time limit has expired. Concluding session and generating your evaluation scorecard.";

    pushToCaptionBuffer({
      id: `timeup_${Date.now()}`,
      speaker: "judge",
      text: timeUpMsg,
      isInterim: false,
      timestamp: Date.now(),
    });

    playJudgeVoice(timeUpMsg, undefined, speechLang === "hi" ? "hi" : "en", timeUpMsg);

    // Conclude session after brief 2-second notice window
    setTimeout(() => {
      handleEndSession();
    }, 2000);
  };

  return (
    <div
      onClick={unlockAudioContext}
      className="min-h-screen bg-black text-white flex flex-col font-sans select-none"
    >
      <Navbar />

      {/* Mandatory Audio Preflight Modal */}
      <AudioPreflightModal
        isOpen={showPreflightModal}
        language={speechLang}
        onConfirm={() => {
          unlockAudioContext();
          setShowPreflightModal(false);
        }}
      />

      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-4 max-w-5xl mx-auto w-full">
        {/* Top Control Bar with 3-Minute Presentation Timer */}
        <SessionControls
          initialDurationMinutes={3}
          isConnected={isConnected}
          onRequestQuestion={handleRequestNextQuestion}
          onEndSession={handleEndSession}
          onTimeUp={handleTimeUp}
          onToggleMic={(enabled) => setMicActive(enabled)}
          onToggleCamera={(enabled) => setCameraActive(enabled)}
          onFlipCamera={() => setFlipCamera((prev) => !prev)}
          isFlipped={flipCamera}
        />

        {/* 3-Minute Time Concluded Banner */}
        {isTimeUp && (
          <div className="p-4 rounded border border-red-600 bg-red-600/15 text-white flex items-center justify-between font-mono text-xs shadow-xl animate-pulse">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-red-500" />
              <div>
                <p className="font-bold text-sm text-red-400">Presentation Time Limit Reached (3:00 / 3:00)</p>
                <p className="text-zinc-300 text-[11px] mt-0.5">Automated scoring engine is finalizing your technical scorecard...</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white font-bold text-[10px] uppercase rounded">
              Concluded
            </span>
          </div>
        )}

        {/* Notice if Audio Playback has error */}
        {ttsNotice && (
          <div className="px-4 py-2 rounded border border-red-600/30 bg-red-600/8 text-red-400 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <VolumeX className="size-4" />
              <span>{ttsNotice}</span>
            </div>
            <button
              onClick={() => unlockAudioContext()}
              className="underline text-white text-[11px] font-semibold"
            >
              Retry Audio Test
            </button>
          </div>
        )}

        {/* Phase / Guardrail Alert Banner */}
        {!checkingPpt && (!pptStatus.hasPpt || !pptStatus.isAnalyzed) && (
          <div className="p-3.5 rounded border border-white/10 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-4 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-white text-sm">
                  {!pptStatus.hasPpt ? "Presentation Deck Notice" : "Presentation Deck Analysis Ready"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {!pptStatus.hasPpt
                    ? "Upload your presentation deck in the submissions tab so the AI judge can cross-examine your architecture."
                    : "Your PPT deck is uploaded. The AI judge evaluates your live presentation against your deck."}
                </p>
              </div>
            </div>
            <Link href="/team/submission">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs h-8 px-4 rounded">
                <UploadCloud className="size-3.5 mr-1.5" />
                {!pptStatus.hasPpt ? "Upload PPT" : "Manage Submissions"}
              </Button>
            </Link>
          </div>
        )}

        {/* Video & AI Stage (Single Column Focus Layout) */}
        <div className="flex flex-col gap-4 flex-1">
          {/* AI Avatar Stage (Center Highlight) */}
          <div className="relative min-h-[420px] sm:min-h-[480px] rounded border border-white/10 bg-zinc-950 flex flex-col items-center justify-between p-6 shadow-2xl overflow-hidden">
            {/* Liveness Challenge Overlay */}
            <LivenessOverlay
              challenge={currentChallenge}
              status={challengeStatus}
              language={speechLang}
              progressMs={challengeProgressMs}
              timeLimitMs={5000}
            />

            {/* Status Header Badge */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="dot-live" />
                <span className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                  AI Judge Stage
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-600/30 bg-red-600/10 text-red-400 uppercase tracking-wider">
                  {avatarState === "listening" ? "Listening..." : avatarState === "thinking" ? "Thinking..." : "Speaking..."}
                </span>
              </div>

              {/* Language Selector: Strictly 3 Languages */}
              <div className="flex items-center gap-2">
                <Languages className="size-3.5 text-zinc-400" />
                <span className="text-[11px] font-mono text-zinc-400">Mode:</span>
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value as any)}
                  className="h-7 px-2.5 rounded bg-black border border-white/15 text-xs text-white outline-none focus:border-red-600 font-mono"
                >
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                  <option value="hinglish">Hinglish (Roman Script)</option>
                </select>
              </div>
            </div>

            {/* Avatar Animation */}
            <div className="my-auto py-2">
              <AiAvatar state={avatarState} subtext={avatarMessage} size="lg" />
            </div>

            {/* TASK 1: Rolling 2-Line Caption Box (Strictly at most 2 lines in DOM) */}
            <div className="w-full max-w-2xl mt-4">
              <RollingCaptionBox lines={captionLines} />
            </div>

            {/* Clean Floating Participant Pip Camera Feed */}
            <div className="absolute bottom-5 right-5 size-36 sm:size-44 rounded border border-white/15 bg-black shadow-2xl overflow-hidden flex items-center justify-center group">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transition-transform duration-200"
                    style={{ transform: flipCamera ? "scaleX(-1)" : "none" }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center text-zinc-600 text-xs font-mono">
                  <VideoOff className="size-6 mb-1 text-zinc-700" />
                  <span>Camera Off</span>
                </div>
              )}

              {/* Flip camera orientation toggle button */}
              <button
                type="button"
                onClick={() => setFlipCamera((prev) => !prev)}
                title={flipCamera ? "Switch to Normal View (Unmirrored)" : "Switch to Mirrored View"}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-black/80 hover:bg-zinc-900 text-zinc-400 border border-white/10 text-[10px] flex items-center gap-1 transition-opacity opacity-80 hover:opacity-100"
              >
                <FlipHorizontal className="size-3 text-red-500" />
                <span className="font-mono text-[9px]">{flipCamera ? "Mirrored" : "Normal"}</span>
              </button>

              <div className="absolute bottom-1.5 left-2 text-[10px] bg-black/80 px-2 py-0.5 rounded font-mono font-medium text-zinc-300 flex items-center gap-1.5 border border-white/10">
                <span className={`size-1.5 rounded-full ${micActive ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`} />
                You ({micActive ? "Mic On" : "Muted"})
              </div>
            </div>
          </div>

          {/* Controls Bar & Interim Input */}
          <div className="p-4 rounded border border-white/10 bg-zinc-950 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-black border border-white/10">
                  <span className={`size-2 rounded-full ${isListening && micActive ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`} />
                  <span className="font-mono text-zinc-300">
                    {isListening && micActive ? "Voice Live (1.8s silence VAD)" : "Mic Inactive"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono">
                  <Volume2 className="size-3.5 text-red-500" />
                  <span>AI Voice: Active</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRequestNextQuestion}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium h-8 px-4 rounded transition-all"
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  {sessionPhase === "pitching" ? "Request Follow-up Question" : "Ask Next Question"}
                </Button>
              </div>
            </div>

            {/* Quick Speech & Hinglish Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pitchInput}
                onChange={(e) => setPitchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendSpeech()}
                placeholder="Microphone captures speech automatically, or type Hindi/Hinglish/English here..."
                className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-red-600 font-sans"
              />
              <Button
                size="sm"
                onClick={() => handleSendSpeech()}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs h-8 px-4 rounded"
              >
                Send
              </Button>
            </div>

            {/* Quick Test Prompts */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1 font-mono">
              <span className="text-[11px] text-zinc-500">Test Prompts:</span>
              <button
                type="button"
                onClick={() =>
                  handleSendSpeech(
                    "Humne offline SQLite aur fast ONNX embeddings implement ki hain taki bina internet ke models seamlessly run kar sakein."
                  )
                }
                className="px-2.5 py-1 rounded bg-white/4 hover:bg-white/8 text-zinc-300 border border-white/10 text-[11px] font-medium transition-colors"
              >
                Hinglish Pitch (Roman)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendSpeech(
                    "हमारा सिस्टम लोकल भाषा में मौसम और फसल की बीमारियों के अलर्ट्स वॉइस मैसेज के ज़रिए किसानों तक पहुंचाता है।"
                  )
                }
                className="px-2.5 py-1 rounded bg-white/4 hover:bg-white/8 text-zinc-300 border border-white/10 text-[11px] font-medium transition-colors"
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
                className="px-2.5 py-1 rounded bg-white/4 hover:bg-white/8 text-zinc-300 border border-white/10 text-[11px] font-medium transition-colors"
              >
                English Technical Pitch
              </button>
              <button
                type="button"
                onClick={() => handleSendSpeech("Humne AI use kiya hai bas.")}
                className="px-2.5 py-1 rounded bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30 text-[11px] font-medium transition-colors"
              >
                Vague Answer (Triggers Cross-Question)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Presentation Submitted Pop-up Modal */}
      <Dialog
        open={showSubmittedModal}
        onOpenChange={(open) => {
          if (!open) {
            router.push("/team/dashboard");
          }
          setShowSubmittedModal(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[480px] bg-zinc-950 border border-white/10 text-white rounded-lg p-6 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            {/* Success Icon */}
            <div className="size-14 rounded-full bg-red-600/10 border border-red-600/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="size-7 text-red-500" />
            </div>

            <DialogTitle className="text-xl font-bold font-heading text-white tracking-tight">
              Presentation Submitted Successfully
            </DialogTitle>

            <DialogDescription className="text-zinc-400 text-xs mt-1.5 max-w-sm">
              Your live judging presentation and Q&amp;A transcript have been submitted to the evaluation engine.
            </DialogDescription>
          </div>

          {/* Submission Details Card */}
          <div className="mt-4 p-4 rounded bg-black border border-white/10 flex flex-col gap-2.5 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-zinc-400">Presentation Deck:</span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {pptStatus.filename || "Registered PPT Deck"}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-zinc-400">Speech Language:</span>
              <span className="text-zinc-200 capitalize">
                {speechLang === "hi" ? "Hindi (हिन्दी)" : speechLang === "hinglish" ? "Hinglish (Roman)" : "English"}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-zinc-400">Behavioral Telemetry:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                Verified &amp; Recorded
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Scorecard Generation:</span>
              <span className="text-red-400 font-semibold flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                Processing
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              onClick={() => router.push("/team/dashboard")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs h-10 rounded transition-all flex items-center justify-center gap-2"
            >
              <span>View Scorecard on Dashboard</span>
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-[11px] font-mono text-zinc-500">
              Automatically redirecting to dashboard in {redirectCountdown}s...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
