"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mic, Brain, Volume2, Shield } from "lucide-react";

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
          icon: <Mic className="size-3 text-white animate-pulse" />,
          label: "Listening to Pitch",
          color: "border-white/20 bg-white/5 text-white",
        };
      case "thinking":
        return {
          icon: <Brain className="size-3 text-zinc-300 animate-bounce" />,
          label: "Analyzing Claims & Code",
          color: "border-white/10 bg-zinc-900 text-zinc-300",
        };
      case "speaking":
        return {
          icon: <Volume2 className="size-3 text-red-500 animate-ping" />,
          label: "AI Judge Speaking",
          color: "border-red-600/40 bg-red-600/10 text-red-400",
        };
      default:
        return {
          icon: <Shield className="size-3 text-zinc-500" />,
          label: "Judge Standby",
          color: "border-white/10 bg-black text-zinc-400",
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
              animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0.08, 0.25] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="absolute size-56 rounded-full bg-red-600/20 blur-xl pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.15, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="absolute size-48 rounded-full border border-red-600/30 pointer-events-none"
            />
          </>
        )}

        {state === "listening" && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute size-52 rounded-full bg-white/10 blur-xl pointer-events-none"
          />
        )}

        {state === "thinking" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute size-48 rounded-full border border-dashed border-white/20 pointer-events-none"
          />
        )}

        {/* Central Synthetic AI Sensor Core */}
        <div className="relative z-10 flex flex-col items-center justify-center size-40 rounded-full border border-white/15 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 shadow-2xl overflow-hidden">
          {/* Subtle Technical Grid in Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:14px_14px] opacity-40" />

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
            className="relative flex flex-col items-center gap-2.5 z-10"
          >
            {/* Synthetic Eyes / Sensor Bar in Crimson Red */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={
                  state === "thinking"
                    ? { opacity: [0.3, 1, 0.3] }
                    : state === "speaking"
                    ? { scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="w-4 h-2 rounded bg-red-600 shadow-[0_0_10px_#dc2626]"
              />
              <motion.div
                animate={
                  state === "thinking"
                    ? { opacity: [1, 0.3, 1] }
                    : state === "speaking"
                    ? { scaleY: [1, 0.2, 1], opacity: [1, 0.8, 1] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="w-4 h-2 rounded bg-red-600 shadow-[0_0_10px_#dc2626]"
              />
            </div>

            {/* Neural Waveform Sensor */}
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
                  className={`w-1 rounded-sm ${
                    state === "speaking"
                      ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                      : state === "listening"
                      ? "bg-white"
                      : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* State Badge */}
      <div
        className={`mt-6 flex items-center gap-2 px-3 py-0.5 rounded border text-xs font-mono font-medium tracking-wider uppercase transition-colors ${badge.color}`}
      >
        {badge.icon}
        <span>{badge.label}</span>
      </div>

      {subtext && (
        <p data-testid="avatar-subtext" className="max-w-xs mt-2 text-center text-xs text-zinc-500 line-clamp-2 font-mono">
          {subtext}
        </p>
      )}
    </div>
  );
}
