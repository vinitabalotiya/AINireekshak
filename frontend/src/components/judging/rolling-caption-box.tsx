"use client";

import React from "react";
import { Mic, Shield } from "lucide-react";

export interface CaptionEntry {
  id: string;
  speaker: "participant" | "judge";
  text: string;
  isInterim?: boolean;
  timestamp: number;
}

interface RollingCaptionBoxProps {
  lines: CaptionEntry[];
}

export function RollingCaptionBox({ lines }: RollingCaptionBoxProps) {
  // Strict invariant: at most 2 lines in UI state and DOM at all times
  const displayLines = lines.slice(-2);

  return (
    <div
      data-testid="caption-box"
      className="w-full max-w-2xl mx-auto min-h-[68px] px-4 py-3 rounded border border-white/10 bg-black/95 flex flex-col justify-center gap-1.5 transition-all duration-300"
    >
      {displayLines.length === 0 ? (
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 italic py-1 font-mono">
          <Mic className="size-3 text-zinc-700" />
          <span>Spoken dialogue and AI inquiries appear here live...</span>
        </div>
      ) : (
        displayLines.map((entry) => {
          const isJudge = entry.speaker === "judge";

          return (
            <div
              key={entry.id}
              data-testid="caption-line"
              data-speaker={entry.speaker}
              className={`flex items-start gap-2.5 text-xs sm:text-sm transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-1 ${
                isJudge
                  ? "text-red-400 font-medium"
                  : entry.isInterim
                  ? "text-zinc-400 italic"
                  : "text-white"
              }`}
            >
              {/* Speaker Label Tag */}
              {isJudge ? (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-600/40 bg-red-600/10 text-red-500 font-mono font-semibold text-[10px] tracking-wider uppercase">
                  <Shield className="size-2.5 text-red-500" />
                  Judge
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/15 bg-white/5 text-zinc-300 font-mono font-semibold text-[10px] tracking-wider uppercase">
                  <Mic className="size-2.5 text-zinc-400" />
                  You
                </span>
              )}

              {/* Caption Text */}
              <span className="leading-snug break-words flex-1 font-sans">
                {entry.text}
                {entry.isInterim && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-red-600 animate-pulse align-middle" />
                )}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
