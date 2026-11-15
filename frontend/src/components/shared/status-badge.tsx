"use client";

import React from "react";

interface StatusBadgeProps {
  status?: string;
  label?: string;
}

/**
 * Status badge — Black/White/Red design system.
 * Active/Live/Error → Red accent
 * Completed/Done → White (inverted stamp look)
 * Pending/Scheduled → Zinc neutral
 * Cancelled/Missed → Dark zinc, muted
 */
export function StatusBadge({ status = "unknown", label }: StatusBadgeProps) {
  const displayLabel = label || status.replace(/_/g, " ").toUpperCase();

  const getStyle = (s: string): string => {
    const lower = s.toLowerCase();
    if (["active", "ongoing", "in_progress", "live"].includes(lower)) {
      return "bg-red-600/10 text-red-500 border-red-600/35";
    }
    if (["failed", "error", "flagged", "liveness_failed", "rejected"].includes(lower)) {
      return "bg-red-600/8 text-red-600 border-red-600/30";
    }
    if (["completed", "analyzed", "done", "passed", "verified"].includes(lower)) {
      return "bg-white text-black border-white font-bold shadow-xs";
    }
    if (["scheduled", "waiting", "pending"].includes(lower)) {
      return "bg-transparent text-zinc-500 border-white/10";
    }
    if (["processing", "uploaded", "analyzing"].includes(lower)) {
      return "bg-white/4 text-zinc-400 border-white/10";
    }
    if (["cancelled", "missed", "errored", "expired"].includes(lower)) {
      return "bg-transparent text-zinc-700 border-zinc-800";
    }
    return "bg-white/4 text-zinc-500 border-white/8";
  };

  const isLive = ["active", "live", "in_progress", "ongoing"].includes(status?.toLowerCase() || "");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase border ${getStyle(status)}`}
    >
      {isLive ? (
        <span className="size-1.5 rounded-full bg-red-600 animate-pulse" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-60" />
      )}
      {displayLabel}
    </span>
  );
}
