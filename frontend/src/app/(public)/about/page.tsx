"use client";

import React from "react";
import Link from "next/link";
import { Languages, Bot, ArrowLeft, ShieldCheck, Cpu } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16 space-y-12">
        <div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-zinc-400 hover:text-white mb-6 p-0 hover:bg-transparent"
            >
              <ArrowLeft className="size-3.5 mr-1.5 text-red-500" />
              BACK TO OVERVIEW
            </Button>
          </Link>

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 bg-red-600" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              Architecture & Mission
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            About <span className="text-red-600">AiNireekshak</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Multilingual, zero-bias hackathon evaluation architecture engineered to understand native Hindi,
            Roman Hinglish, and English without phonetic or linguistic degradation.
          </p>
        </div>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
          {/* Card 1 */}
          <section className="p-6 rounded border border-white/10 bg-zinc-950/60 hover:border-red-600/40 transition-colors space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-black border border-white/10 text-red-500">
                <Languages className="size-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest block">01 / Challenge</span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Linguistic Bias in Automated Evaluation
                </h2>
              </div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Standard automated assessment frameworks mandate English or rely on naïve machine translation that collapses when participants deliver technical pitches in Hindi or Roman Hinglish. Crucial system terminology gets mistranslated, destroying accurate problem-solving and architectural scoring.
            </p>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Innovators explaining complex distributed architectures or embedded engineering in code-mixed languages are frequently penalized by rigid, monolingual rubrics.
            </p>
          </section>

          {/* Card 2 - White Tone Feature Spotlight */}
          <section className="p-6 rounded border border-white bg-white text-black shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-black text-white">
                <Bot className="size-4 text-red-500" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-red-600 uppercase tracking-widest block font-bold">02 / Engine</span>
                <h2 className="text-base font-extrabold text-black tracking-tight">
                  Deterministic Code-Mixed Transliteration & Analysis
                </h2>
              </div>
            </div>
            <p className="text-zinc-700 text-xs sm:text-sm leading-relaxed">
              AiNireekshak executes deterministic transliteration pipelines that map Hindi phonetics directly into standardized Roman Hinglish without corrupting technical English vocabularies. Utterances are captioned with a strict 2-line rolling buffer and dispatched to LLM cross-examination models.
            </p>
            <p className="text-zinc-700 text-xs sm:text-sm leading-relaxed">
              Judges converse with an audio-grounded synthetic avatar that probes repository architecture, PPT artifacts, and technical feasibility in real time.
            </p>
          </section>

          {/* Card 3 */}
          <section className="p-6 rounded border border-white/10 bg-zinc-950/60 hover:border-red-600/40 transition-colors space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-black border border-white/10 text-red-500">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest block">03 / Verification</span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Cryptographic Liveness & Silent MediaPipe Behavioral Metrics
                </h2>
              </div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Anti-replay defenses issue time-sensitive randomized biometric challenges (palm displays, thumbs-up, head yaw verification) protected by one-time server nonces. Video streams are analyzed silently via client-side MediaPipe tasks, normalizing confidence, eye contact, and engagement onto an authoritative 1–100 scale.
            </p>
          </section>
        </div>

        {/* Footer info box */}
        <div className="p-5 rounded border border-white/10 bg-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-red-500" />
            <span className="text-zinc-400">Stack: Next.js 16 App Router · FastAPI · MediaPipe Vision · PyTorch</span>
          </div>
          <Link href="/admin/login">
            <span className="text-red-500 hover:text-red-400 hover:underline">
              ADMIN CONSOLE &rarr;
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
