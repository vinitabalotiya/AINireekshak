"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Languages,
  Bot,
  FileCode2,
  Scale,
  Award,
  ArrowRight,
  Shield,
  Users,
  Radio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { AiAvatar, AvatarState } from "@/components/avatar/ai-avatar";
import { CaptionPanel, CaptionItem } from "@/components/judging/caption-panel";

export default function LandingPage() {
  const [avatarState, setAvatarState] = useState<AvatarState>("speaking");

  const sampleCaptions: CaptionItem[] = [
    {
      speaker: "participant",
      language: "hinglish",
      content:
        "Humne crop disease detection ke liye lightweight CNN model train kiya hai jo offline mobile device par chalta hai.",
      confidence: 0.98,
    },
    {
      speaker: "ai_judge",
      language: "en",
      content:
        "Interesting architectural choice. Why opt for a custom CNN over quantized MobileNetV3 for edge deployment on budget smartphones?",
    },
    {
      speaker: "participant",
      language: "hi",
      content:
        "हमने लेटेंसी और मॉडल साइज को 4MB से कम रखने के लिए कस्टम आर्किटेक्चर चुना।",
      romanized_content:
        "Humne latency aur model size ko 4MB se kam rakhne ke liye custom architecture chuna.",
      confidence: 0.99,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-red-600/30 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-white/8">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-white/10 bg-white/4 text-zinc-300 text-xs font-mono tracking-widest uppercase mb-8">
            <span className="dot-live" />
            <span>Autonomous Hackathon Evaluation Platform</span>
          </div>

          {/* Stark Main Heading */}
          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.08]">
            Fair Hackathon Judging. <br className="hidden sm:inline" />
            <span className="text-red-500 underline decoration-red-600/40 underline-offset-8">
              In Any Spoken Language.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto mt-7 text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
            Most automated judges fail when participants pitch naturally in Hindi, Hinglish, or code-mixed dialects.
            <strong className="text-white font-medium"> AiNireekshak</strong> preserves original spoken context, conducts real-time synthetic avatar Q&amp;A, and generates substantiated, audit-ready scorecards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <Link href="/team/login">
              <Button size="lg" className="h-11 px-6 bg-white hover:bg-zinc-100 text-black font-semibold rounded shadow-md border border-white hover:border-red-600 transition-all hover:translate-y-[-1px]">
                <Users className="size-4 mr-2 text-black" />
                Participant Portal
                <ArrowRight className="size-4 ml-2 text-red-600" />
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button size="lg" className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded shadow-none transition-all hover:translate-y-[-1px]">
                <Shield className="size-4 mr-2 text-white" />
                Organizer &amp; Admin Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Interactive Judging Demonstration Mockup */}
        <div className="max-w-5xl mx-auto px-6 mt-16">
          <div className="rounded border border-white/10 bg-zinc-950 p-1 shadow-2xl">
            <div className="rounded bg-black border border-white/8 p-6">
              {/* Chrome bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="dot-live" />
                  <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-widest">
                    Live Session Demonstration
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 border border-white/10 text-xs font-mono text-zinc-400">
                  <span>State:</span>
                  <span className="text-red-500 font-semibold uppercase">{avatarState}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center">
                  <AiAvatar state={avatarState} subtext="Analyzing technical choices and code architecture in real-time." />
                  <div className="flex items-center gap-1.5 mt-4">
                    {(["idle", "listening", "thinking", "speaking"] as AvatarState[]).map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant="outline"
                        onClick={() => setAvatarState(st)}
                        className={`text-xs h-7 px-3 capitalize font-mono rounded transition-all ${
                          avatarState === st
                            ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
                            : "border-white/10 bg-transparent text-zinc-400 hover:text-white hover:border-white/30"
                        }`}
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-7 h-[300px]">
                  <CaptionPanel captions={sampleCaptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-mono font-semibold text-red-500 uppercase tracking-widest mb-2">Core Capabilities</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered for Fair, Multilingual Evaluation
          </h2>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            Eliminating linguistic bias and arbitrary judging with continuous conversational intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Languages,
              title: "Native Context Preservation",
              description:
                "Zero lossy translation. Presentations in Hindi, Hinglish, and English are transcribed with technical terminology and intent completely intact.",
            },
            {
              icon: Bot,
              title: "Synthetic AI Judge Avatar",
              description:
                "Conducts responsive 2-way cross-examinations with dynamic conversational states: idle, listening, thinking, and spoken voice output.",
            },
            {
              icon: Scale,
              title: "Substantiated Scoring",
              description:
                "Every assigned score is grounded in exact transcript excerpts or extracted code artifacts, preventing arbitrary or hallucinated marks.",
            },
            {
              icon: FileCode2,
              title: "Static Code & Repo Analysis",
              description:
                "Inspects uploaded ZIP archives and repositories without unsafe code execution. Detects tech stacks, dependency depth, and implementation quality.",
            },
            {
              icon: Radio,
              title: "Liveness Anti-Replay",
              description:
                "Cryptographic anti-replay challenges verify participants are live, detecting pre-recorded videos and synthetic face injections.",
            },
            {
              icon: Award,
              title: "Tie-Breaking Standings & Export",
              description:
                "Manage competitions, allocate team slots with secret access codes, view automated tie-breaking leaderboards, and export to CSV or Excel.",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded border border-white/8 bg-zinc-950/70 hover:border-red-600/40 hover:bg-zinc-900/60 transition-all duration-200 group"
              >
                <div className="size-10 rounded border border-white/10 bg-white/4 text-zinc-300 group-hover:text-red-500 group-hover:border-red-600/30 flex items-center justify-center mb-5 transition-colors">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-zinc-100 transition-colors">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed font-normal">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow Steps - White Tone Architectural Section */}
      <section className="py-20 border-t border-b border-zinc-200 bg-white text-black selection:bg-black selection:text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-mono font-bold text-red-600 uppercase tracking-widest mb-1.5">Judging Lifecycle</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">Structured 4-Phase Evaluation</h2>
            <p className="mt-2 text-xs text-zinc-600 font-mono">Continuous deterministic progression from repository upload to certified rankings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Submit Code & Docs",
                desc: "Upload PPT/PDF pitch decks and source code archives. Automated AI extraction indexes the technical architecture.",
              },
              {
                step: "02",
                title: "Live Judging Room",
                desc: "Join the session. Pitch naturally in Hindi, Hinglish, or English with non-accumulating 2-line rolling live captions.",
              },
              {
                step: "03",
                title: "Interactive AI Q&A",
                desc: "The AI Judge speaks back via voice, challenging trade-offs, architecture decisions, and code limitations.",
              },
              {
                step: "04",
                title: "Audited Scorecard",
                desc: "Organizers review weighted scoring breakdown with cited evidence references and export certified rankings.",
              },
            ].map((step, idx) => (
              <div key={idx} className="relative p-5 rounded border border-zinc-200 bg-zinc-50 hover:bg-white hover:border-black hover:shadow-lg transition-all group">
                <span className="text-3xl font-extrabold font-mono text-red-600 group-hover:text-red-700 select-none">{step.step}</span>
                <h4 className="mt-2 text-base font-bold text-black">{step.title}</h4>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed font-sans">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/8 py-8 px-6 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-5 bg-red-600 flex items-center justify-center text-white font-black text-[9px]">AI</div>
            <span className="font-semibold text-white">AiNireekshak</span>
            <span className="text-zinc-600">— Multilingual AI Hackathon Judge</span>
          </div>
          <p>© 2026 AiNireekshak Platform. Pure Minimalist Architecture.</p>
        </div>
      </footer>
    </div>
  );
}
