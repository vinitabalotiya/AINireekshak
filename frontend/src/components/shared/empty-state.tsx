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
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
      <div className="p-3 mb-4 rounded-full bg-slate-800/80 text-slate-400">
        {icon || <FolderX className="size-8" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      <p className="max-w-sm mt-1 text-sm text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5 bg-blue-600 hover:bg-blue-500 text-white">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
