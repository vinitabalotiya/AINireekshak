"use client";

import React, { useState } from "react";
import { Volume2, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPreflightModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  language: "hi" | "en" | "hinglish";
}

export function AudioPreflightModal({ isOpen, onConfirm, language }: AudioPreflightModalProps) {
  const [tested, setTested] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  if (!isOpen) return null;

  const playTestChime = () => {
    try {
      setIsPlayingTest(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setTested(true);
        setIsPlayingTest(false);
        return;
      }

      const ctx = new AudioCtx();
      ctx.resume().then(() => {
        // Synthesize pleasant two-tone confirmation chime
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880.0, now + 0.15); // A5

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(293.66, now); // D4
        osc2.frequency.setValueAtTime(440.0, now + 0.15); // A4

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);

        setTimeout(() => {
          setTested(true);
          setIsPlayingTest(false);
        }, 600);
      });

      // Unlock SpeechSynthesis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
        const silentUtter = new SpeechSynthesisUtterance("Audio check verified.");
        silentUtter.volume = 0.8;
        silentUtter.rate = 1.2;
        window.speechSynthesis.speak(silentUtter);
      }
    } catch (e) {
      console.warn("Audio preflight test exception:", e);
      setTested(true);
      setIsPlayingTest(false);
    }
  };

  const handleStart = () => {
    playTestChime();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded border border-white/10 bg-zinc-950 shadow-2xl flex flex-col gap-5 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded border border-red-600/30 bg-red-600/10 text-red-500">
            <Volume2 className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold tracking-tight text-white uppercase">
              Speaker &amp; Audio Readiness
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Confirm your audio output so the AI judge can speak questions to you.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded bg-black border border-white/8 space-y-2 text-xs text-zinc-300 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Selected Language:</span>
            <span className="text-white font-semibold uppercase">{language}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Autoplay Protection:</span>
            <span className="text-red-400">Requires User Click</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Voice Synthesis Engine:</span>
            <span className="text-white">Dual-Engine Active</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={playTestChime}
            disabled={isPlayingTest}
            className={`w-full h-9 rounded text-xs font-mono transition-all ${
              tested
                ? "border-white/20 bg-white/5 text-white"
                : "border-white/15 bg-black hover:border-white/30 text-zinc-200"
            }`}
          >
            {tested ? (
              <>
                <CheckCircle2 className="size-3.5 mr-2 text-white" />
                Audio Output Verified (Click to Re-test)
              </>
            ) : (
              <>
                <Play className="size-3.5 mr-2 text-red-500" />
                {isPlayingTest ? "Playing Test Tone..." : "Play Test Tone (Confirm You Can Hear)"}
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleStart}
            className="w-full h-10 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-xs font-mono uppercase tracking-wider transition-all"
          >
            Start Judging Session
          </Button>
        </div>

        <p className="text-[10px] text-center text-zinc-600 font-mono">
          Clicking unlocks browser audio so the AI judge speaks with real audio.
        </p>
      </div>
    </div>
  );
}
