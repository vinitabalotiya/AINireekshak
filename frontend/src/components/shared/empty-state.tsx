"use client";

import React from "react";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-14 text-center border border-dashed border-white/8 bg-zinc-950/40">
      <div className="p-3 mb-5 border border-white/8 text-zinc-600">
        {icon || <FolderX className="size-8" />}
      </div>
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      <p className="max-w-sm mt-2 text-sm text-zinc-500 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
