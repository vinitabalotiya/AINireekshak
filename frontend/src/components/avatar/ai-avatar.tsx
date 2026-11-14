"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Mic, Brain, Volume2 } from "lucide-react";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface AiAvatarProps {
  state: AvatarState;
  size?: "sm" | "md" | "lg";
  subtext?: string;
}

export function AiAvatar({ state = "idle", size = "lg", subtext }: AiAvatarProps) {
  const getAvatarBadge = () => {
    switch (state) {
      case "listening":
        return {
          icon: <Mic className="size-3.5 animate-pulse text-emerald-400" />,
          label: "Listening to Pitch...",
          color: "border-emerald-500/40 bg-emerald-950/60 text-emerald-300",
        };
      case "thinking":
        return {
          icon: <Brain className="size-3.5 animate-bounce text-violet-400" />,
          label: "Analyzing Claims & Code...",
          color: "border-violet-500/40 bg-violet-950/60 text-violet-300",
        };
      case "speaking":
        return {
          icon: <Volume2 className="size-3.5 animate-ping text-blue-400" />,
          label: "AI Judge Speaking",
          color: "border-blue-500/40 bg-blue-950/60 text-blue-300",
        };
      default:
        return {
          icon: <Sparkles className="size-3.5 text-slate-400" />,
          label: "AiNireekshak Standby",
          color: "border-slate-700 bg-slate-900/60 text-slate-300",
        };
    }
  };

  const badge = getAvatarBadge();

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      {/* Outer Glow Halo */}
      <div className="relative flex items-center justify-center">
        {/* Animated concentric pulse rings */}
        {state === "speaking" && (
          <>
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="absolute size-56 rounded-full bg-blue-500/20 blur-xl"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="absolute size-48 rounded-full border border-blue-400/40"
            />
          </>
        )}

        {state === "listening" && (
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute size-52 rounded-full bg-emerald-500/20 blur-xl"
          />
        )}

        {state === "thinking" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute size-48 rounded-full border border-dashed border-violet-400/50"
          />
        )}

        {/* Central Synthetic AI Humanoid Avatar Face/Core */}
        <div className="relative z-10 flex flex-col items-center justify-center size-40 rounded-full border border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950/40 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Subtle Circuit Grid in Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px] opacity-15" />

          {/* Avatar Face/Sensor Feature */}
          <motion.div
            animate={
              state === "speaking"
                ? { y: [0, -3, 0] }
                : state === "listening"
                ? { scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="relative flex flex-col items-center gap-2"
          >
            {/* Synthetic Eyes / Sensor Bar */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={
                  state === "thinking"
                    ? { opacity: [0.4, 1, 0.4] }
                    : state === "speaking"
                    ? { scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="w-4 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
              />
              <motion.div
                animate={
                  state === "thinking"
                    ? { opacity: [1, 0.4, 1] }
                    : state === "speaking"
                    ? { scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="w-4 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
              />
            </div>

            {/* Neural Mouth Waveform Sensor */}
            <div className="flex items-center gap-1 h-6">
              {[0.4, 0.8, 1.2, 0.7, 0.3].map((heightScale, idx) => (
                <motion.span
                  key={idx}
                  animate={
                    state === "speaking"
                      ? { height: [4, 18 * heightScale, 4] }
                      : state === "listening"
                      ? { height: [3, 8 * heightScale, 3] }
                      : { height: 3 }
                  }
                  transition={{ repeat: Infinity, duration: 0.8, delay: idx * 0.12 }}
                  className={`w-1 rounded-full ${
                    state === "speaking"
                      ? "bg-blue-400 shadow-[0_0_6px_#60a5fa]"
                      : state === "listening"
                      ? "bg-emerald-400"
                      : "bg-slate-600"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* State Badge */}
      <div
        className={`mt-6 flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-medium transition-colors ${badge.color}`}
      >
        {badge.icon}
        <span>{badge.label}</span>
      </div>

      {subtext && (
        <p className="max-w-xs mt-2 text-center text-xs text-slate-400 line-clamp-2">
          {subtext}
        </p>
      )}
    </div>
  );
}
