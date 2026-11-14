"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ message = "Loading...", size = "md" }: LoadingProps) {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-10" : "size-6";

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-400">
      <Loader2 className={`${sizeClass} animate-spin text-blue-500`} />
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
