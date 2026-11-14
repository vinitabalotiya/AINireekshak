"use client";

import React from "react";
import { statusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
  label?: string;
}

export function StatusBadge({ status = "unknown", label }: StatusBadgeProps) {
  const colors = statusColor(status);
  const displayLabel = label || status.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.badge}`}
    >
      <span className={`size-1.5 rounded-full ${colors.text} bg-current`} />
      {displayLabel}
    </span>
  );
}
