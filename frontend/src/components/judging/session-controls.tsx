"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, HelpCircle, Clock, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface SessionControlsProps {
  initialDurationMinutes?: number;
  isConnected?: boolean;
  onRequestQuestion?: () => void;
  onEndSession?: () => void;
  onTimeUp?: () => void;
  onToggleMic?: (enabled: boolean) => void;
  onToggleCamera?: (enabled: boolean) => void;
  onFlipCamera?: () => void;
  isFlipped?: boolean;
  isQuestionDisabled?: boolean;
  questionDisabledReason?: string;
}

export function SessionControls({
  initialDurationMinutes = 3,
  isConnected = true,
  onRequestQuestion,
  onEndSession,
  onTimeUp,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
  isFlipped = false,
  isQuestionDisabled = false,
  questionDisabledReason,
}: SessionControlsProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationMinutes * 60);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const hasTriggeredTimeUpRef = useRef(false);

  useEffect(() => {
    setSecondsRemaining(initialDurationMinutes * 60);
    hasTriggeredTimeUpRef.current = false;
  }, [initialDurationMinutes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasTriggeredTimeUpRef.current) {
            hasTriggeredTimeUpRef.current = true;
            onTimeUp?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeUp]);

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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-zinc-950 border border-white/10 rounded">
        {/* Left: Connection status and Session timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black border border-white/10">
            <span className={`size-1.5 rounded-full ${isConnected ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-xs font-mono font-medium text-zinc-300">
              {isConnected ? "STAGE LIVE" : "OFFLINE"}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded border font-mono text-xs font-semibold ${
              secondsRemaining === 0
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : secondsRemaining < 60
                ? "bg-red-600/10 text-red-500 border-red-600/40 animate-pulse"
                : "bg-black text-white border-white/10"
            }`}
          >
            <Clock className="size-3.5 text-zinc-400" />
            <span>{secondsRemaining === 0 ? "00:00 (TIME UP)" : formatTimer(secondsRemaining)}</span>
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
            className={`h-8 px-3 border transition-colors rounded text-xs font-mono ${
              micEnabled
                ? "bg-black hover:bg-zinc-900 border-white/15 text-white"
                : "bg-red-600/10 hover:bg-red-600/20 border-red-600/40 text-red-400"
            }`}
          >
            {micEnabled ? <Mic className="size-3.5 mr-1.5 text-zinc-300" /> : <MicOff className="size-3.5 mr-1.5 text-red-500" />}
            <span>{micEnabled ? "Mute" : "Unmute"}</span>
          </Button>

          {/* Camera */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCameraToggle}
            className={`h-8 px-3 border transition-colors rounded text-xs font-mono ${
              cameraEnabled
                ? "bg-black hover:bg-zinc-900 border-white/15 text-white"
                : "bg-red-600/10 hover:bg-red-600/20 border-red-600/40 text-red-400"
            }`}
          >
            {cameraEnabled ? <Video className="size-3.5 mr-1.5 text-zinc-300" /> : <VideoOff className="size-3.5 mr-1.5 text-red-500" />}
            <span>{cameraEnabled ? "Stop Cam" : "Start Cam"}</span>
          </Button>

          {/* Flip / Normal Camera Orientation */}
          {cameraEnabled && onFlipCamera && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onFlipCamera}
              title={isFlipped ? "Switch camera to Normal View (Unmirrored)" : "Switch camera to Mirrored View"}
              className="h-8 px-2.5 bg-black hover:bg-zinc-900 border-white/15 text-zinc-300 text-xs rounded"
            >
              <span className="text-[11px] font-mono">{isFlipped ? "Mirrored" : "Normal"}</span>
            </Button>
          )}

          {/* Request Follow-up Question from AI */}
          {onRequestQuestion && (
            <Button
              type="button"
              size="sm"
              onClick={onRequestQuestion}
              disabled={isQuestionDisabled}
              title={questionDisabledReason || "Ask Next Question"}
              className={`h-8 px-3 font-medium text-xs font-mono rounded transition-all ${
                isQuestionDisabled
                  ? "bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              <HelpCircle className="size-3.5 mr-1.5" />
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
            className="h-8 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-medium rounded transition-all"
          >
            <PhoneOff className="size-3.5 mr-1.5" />
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
