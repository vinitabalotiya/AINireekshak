"use client";

import React from "react";
import { CheckCircle2, XCircle, Hand, ThumbsUp, Scissors, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export interface LivenessChallenge {
  id: string;
  nonce: string;
  type: "open_palm" | "thumb_up" | "victory" | "turn_head_left" | "turn_head_right";
  prompt: string;
  timeLimitSeconds?: number;
  scheduledAt?: number;
}

interface LivenessOverlayProps {
  challenge: LivenessChallenge | null;
  status: "idle" | "active" | "passed" | "missed" | "errored";
  language?: "hi" | "en" | "hinglish";
  progressMs: number; // 0 to 5000
  timeLimitMs?: number; // 5000
}

const CHALLENGE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    emoji: string;
    titles: { en: string; hi: string; hinglish: string };
  }
> = {
  open_palm: {
    icon: <Hand className="size-5 text-red-500 animate-pulse" />,
    emoji: "🖐️",
    titles: {
      en: "Show your open palm to the camera",
      hi: "कृपया कैमरे के सामने खुली हथेली दिखाएं",
      hinglish: "Apna open palm camera ke aage dikhayein",
    },
  },
  thumb_up: {
    icon: <ThumbsUp className="size-5 text-red-500 animate-bounce" />,
    emoji: "👍",
    titles: {
      en: "Give a thumbs up to the camera",
      hi: "कृपया कैमरे के सामने Thumbs Up दिखाएं",
      hinglish: "Camera ke samne Thumbs Up karein",
    },
  },
  victory: {
    icon: <Scissors className="size-5 text-red-500 rotate-90" />,
    emoji: "✌️",
    titles: {
      en: "Show a victory peace sign (two fingers)",
      hi: "कृपया विक्ट्री (Peace Sign) दिखाएं",
      hinglish: "Victory / Peace sign camera ke aage dikhayein",
    },
  },
  turn_head_left: {
    icon: <ArrowLeft className="size-5 text-red-500 animate-pulse" />,
    emoji: "⬅️",
    titles: {
      en: "Turn your head to the LEFT, then look front",
      hi: "अपना सिर बाईं (Left) ओर घुमाएं, फिर सामने देखें",
      hinglish: "Apna head LEFT turn karein aur wapas center dekhein",
    },
  },
  turn_head_right: {
    icon: <ArrowRight className="size-5 text-red-500 animate-pulse" />,
    emoji: "➡️",
    titles: {
      en: "Turn your head to the RIGHT, then look front",
      hi: "अपना सिर दाईं (Right) ओर घुमाएं, फिर सामने देखें",
      hinglish: "Apna head RIGHT turn karein aur wapas center dekhein",
    },
  },
};

export function LivenessOverlay({
  challenge,
  status,
  language = "en",
  progressMs,
  timeLimitMs = 5000,
}: LivenessOverlayProps) {
  if (!challenge && status === "idle") return null;

  const config = challenge ? CHALLENGE_CONFIG[challenge.type] || CHALLENGE_CONFIG.open_palm : CHALLENGE_CONFIG.open_palm;
  const langKey = language === "hi" ? "hi" : language === "hinglish" ? "hinglish" : "en";
  const promptText = challenge ? config.titles[langKey] || challenge.prompt : "";

  // Progress percentage (100 -> 0)
  const remainingFraction = Math.max(0, Math.min(1, 1 - progressMs / timeLimitMs));
  const remainingSeconds = Math.max(0, Math.ceil((timeLimitMs - progressMs) / 1000));

  // Circular progress SVG constants
  const size = 48;
  const strokeWidth = 3;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingFraction);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
      <div className="flex items-center gap-3 px-4 py-2 rounded border border-white/15 bg-black shadow-2xl">
        {/* Status Icon or Countdown Ring */}
        {status === "passed" ? (
          <div className="flex items-center justify-center size-9 rounded bg-white text-black animate-in zoom-in-75 duration-200">
            <CheckCircle2 className="size-5" />
          </div>
        ) : status === "missed" ? (
          <div className="flex items-center justify-center size-9 rounded bg-red-600/15 text-red-500 animate-in zoom-in-75 duration-200">
            <XCircle className="size-5" />
          </div>
        ) : (
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#dc2626"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-100 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white">
              {remainingSeconds}s
            </div>
          </div>
        )}

        {/* Text info */}
        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-zinc-500">
            <ShieldCheck className="size-3 text-red-500" />
            <span>Presence Verification Challenge</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base">{config.emoji}</span>
            <span
              className={`text-xs font-mono font-semibold tracking-wide ${
                status === "passed"
                  ? "text-white uppercase"
                  : status === "missed"
                  ? "text-red-500 uppercase"
                  : "text-zinc-100"
              }`}
            >
              {status === "passed"
                ? "Challenge Verified ✓"
                : status === "missed"
                ? "Challenge Window Missed"
                : promptText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
