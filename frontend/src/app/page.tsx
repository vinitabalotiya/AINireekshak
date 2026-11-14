"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Languages,
  Bot,
  FileCode2,
  Scale,
  Award,
  ArrowRight,
  Shield,
  Users,
  CheckCircle2,
  Radio,
  ChevronRight,
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
      content: "Humne crop disease detection ke liye lightweight CNN model train kiya hai jo offline mobile device par chalta hai.",
      confidence: 0.98,
    },
    {
      speaker: "ai_judge",
      language: "en",
      content: "Interesting choice. Why did you opt for a custom CNN over quantized MobileNetV3 for edge deployment on low-end devices?",
    },
    {
      speaker: "participant",
      language: "hi",
      content: "हमने लेटेंसी और मॉडल साइज को 4MB से कम रखने के लिए कस्टम आर्किटेक्चर चुना।",
      romanized_content: "[Hindi Transcript] Humne latency aur model size ko 4MB se kam rakhne ke liye custom architecture chuna.",
      confidence: 0.99,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-slate-800/80">
        {/* Glow Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-violet-600/15 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-6"
          >
            <Sparkles className="size-3.5" />
            <span>Next-Generation Multilingual AI Hackathon Judge</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]"
          >
            Fair Hackathon Judging for{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              Every Spoken Language.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto mt-6 text-base sm:text-lg text-slate-400 leading-relaxed font-normal"
          >
            Existing AI judges fail when participants present in Hindi, Hinglish, or regional Indian dialects.
            <strong className="text-slate-200 font-medium"> AiNireekshak</strong> preserves original spoken context, conducts real-time synthetic avatar interviews, and generates evidence-linked scores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-8"
          >
            <Link href="/team/login">
              <Button size="lg" className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25">
                <Users className="size-4 mr-2" />
                Participant Portal
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button size="lg" variant="outline" className="h-11 px-6 border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium">
                <Shield className="size-4 mr-2 text-blue-400" />
                Organizer & Admin Portal
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Live Interactive Judging Mockup */}
        <div className="max-w-5xl mx-auto px-6 mt-16">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/60 shadow-2xl">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Interactive Judging Demonstration
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-xs text-slate-400">
                  <span>Avatar State:</span>
                  <span className="text-blue-400 font-medium capitalize">{avatarState}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center">
                  <AiAvatar state={avatarState} subtext="Analyzing technical choices and code architecture in real-time." />
                  <div className="flex items-center gap-2 mt-4">
                    {(["idle", "listening", "thinking", "speaking"] as AvatarState[]).map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant={avatarState === st ? "default" : "outline"}
                        onClick={() => setAvatarState(st)}
                        className={`text-xs h-7 px-2.5 capitalize ${
                          avatarState === st ? "bg-blue-600 text-white" : "border-slate-800 text-slate-400"
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">
            Engineered for Fair, Multilingual Evaluation
          </h2>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed">
            Eliminating linguistic bias and static PPT judgment with genuine conversational intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Languages,
              title: "Native Language Preservation",
              description:
                "No lossy translation bottleneck. Speech in Hindi, Hinglish, and English is transcribed and judged with its original technical intent intact.",
            },
            {
              icon: Bot,
              title: "Synthetic AI Judge Avatar",
              description:
                "Conducts interactive Q&A sessions with dynamic conversational states: idle, listening, thinking, and speaking via responsive speech synthesis.",
            },
            {
              icon: Scale,
              title: "Evidence-Based Scoring",
              description:
                "Every score is substantiated by exact transcript excerpts or extracted code evidence, preventing arbitrary or hallucinated marks.",
            },
            {
              icon: FileCode2,
              title: "Static Code & Repo Analysis",
              description:
                "Analyzes uploaded ZIP archives and GitHub repositories without unsafe execution. Detects languages, dependencies, and implementation depth.",
            },
            {
              icon: Radio,
              title: "Participant Transcript Corrections",
              description:
                "Speech recognition hiccups don't become judging penalties. Participants can review, repeat, or correct misheard statements live.",
            },
            {
              icon: Award,
              title: "Organiser Operations & Export",
              description:
                "Manage events, bulk import teams with secret access codes, view automated tie-breaking rankings, and export to CSV or Excel.",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-200"
              >
                <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Judging Lifecycle</h2>
            <p className="mt-2 text-sm text-slate-400">From project upload to verified ranking report</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Submit Code & Docs",
                desc: "Upload PPT/PDF presentations, source code ZIP, or register GitHub repositories.",
              },
              {
                step: "02",
                title: "Live Judging Room",
                desc: "Join the video room. Pitch naturally in Hindi, Hinglish, or English with real-time captions.",
              },
              {
                step: "03",
                title: "Interactive AI Follow-up",
                desc: "The AI avatar questions technical trade-offs, architecture decisions, and limitations.",
              },
              {
                step: "04",
                title: "Structured Scorecard",
                desc: "Organizers review weighted scores, review evidence citations, and export rankings.",
              },
            ].map((step, idx) => (
              <div key={idx} className="relative p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                <span className="text-2xl font-bold font-mono text-blue-500/40">{step.step}</span>
                <h4 className="mt-2 text-base font-semibold text-slate-200">{step.title}</h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-500" />
            <span className="font-semibold text-slate-300">AiNireekshak</span>
            <span>— Multilingual AI Hackathon Judge</span>
          </div>
          <p>© 2026 AiNireekshak Platform. Built for Indian hackathons.</p>
        </div>
      </footer>
    </div>
  );
}
