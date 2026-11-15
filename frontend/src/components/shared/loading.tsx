"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ message = "Loading...", size = "md" }: LoadingProps) {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-6";

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className={`${sizeClass} animate-spin text-red-600`} />
      {message && <p className="text-sm text-zinc-500 tracking-wide">{message}</p>}
    </div>
  );
}
