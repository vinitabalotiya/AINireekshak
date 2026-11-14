"use client";

import React, { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, HelpCircle, Clock, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface SessionControlsProps {
  initialDurationMinutes?: number;
  isConnected?: boolean;
  onRequestQuestion?: () => void;
  onEndSession?: () => void;
  onToggleMic?: (enabled: boolean) => void;
  onToggleCamera?: (enabled: boolean) => void;
}

export function SessionControls({
  initialDurationMinutes = 15,
  isConnected = true,
  onRequestQuestion,
  onEndSession,
  onToggleMic,
  onToggleCamera,
}: SessionControlsProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationMinutes * 60);
  const [showEndDialog, setShowEndDialog] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMicToggle = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    onToggleMic?.(next);
  };

  const handleCameraToggle = () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    onToggleCamera?.(next);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl backdrop-blur-md">
        {/* Left: Connection status and Session timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <Wifi className={`size-4 ${isConnected ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? "Room Live" : "Reconnecting"}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold ${
              secondsRemaining < 180
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                : "bg-slate-900 text-slate-200 border-slate-800"
            }`}
          >
            <Clock className="size-4 text-slate-400" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Center: Device and AI Controls */}
        <div className="flex items-center gap-2">
          {/* Mic */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleMicToggle}
            className={`h-9 px-3 border transition-colors ${
              micEnabled
                ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100"
                : "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300"
            }`}
          >
            {micEnabled ? <Mic className="size-4 mr-1.5 text-emerald-400" /> : <MicOff className="size-4 mr-1.5 text-rose-400" />}
            <span className="text-xs">{micEnabled ? "Mute" : "Unmute"}</span>
          </Button>

          {/* Camera */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCameraToggle}
            className={`h-9 px-3 border transition-colors ${
              cameraEnabled
                ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100"
                : "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300"
            }`}
          >
            {cameraEnabled ? <Video className="size-4 mr-1.5 text-blue-400" /> : <VideoOff className="size-4 mr-1.5 text-rose-400" />}
            <span className="text-xs">{cameraEnabled ? "Stop Cam" : "Start Cam"}</span>
          </Button>

          {/* Request Follow-up Question from AI */}
          {onRequestQuestion && (
            <Button
              type="button"
              size="sm"
              onClick={onRequestQuestion}
              className="h-9 px-3 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md"
            >
              <HelpCircle className="size-4 mr-1.5" />
              Ask Next Question
            </Button>
          )}
        </div>

        {/* Right: End Session */}
        <div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setShowEndDialog(true)}
            className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
          >
            <PhoneOff className="size-4 mr-1.5" />
            End Session
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showEndDialog}
        onOpenChange={setShowEndDialog}
        title="Conclude AI Judging Session?"
        description="Are you sure you want to finish the judging pitch? The transcript will be submitted to the evaluation engine to generate your score report."
        confirmLabel="Finish & Generate Report"
        variant="destructive"
        onConfirm={() => onEndSession?.()}
      />
    </>
  );
}
