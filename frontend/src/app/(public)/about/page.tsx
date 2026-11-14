"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Languages, Bot, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-200 mb-4">
              <ArrowLeft className="size-3.5 mr-1" /> Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-100">About AiNireekshak</h1>
          <p className="mt-2 text-sm text-slate-400">
            Multilingual AI hackathon judging platform designed to empower participants from all language backgrounds.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Languages className="size-5 text-blue-400" />
              The Problem: Linguistic Bias in Automated Judging
            </h2>
            <p>
              Most automated judging systems rely solely on English translations, static PPTs, and submitted documents. They often fail to understand the original context, phrasing, cultural meaning, and technical explanations of participants presenting in Hindi, Hinglish, and regional Indian languages.
            </p>
            <p>
              When high-performing innovators present technical breakthroughs in Hinglish or regional dialects, generic translation pipelines scramble technical terminology, reducing evaluation scores unfairly.
            </p>
          </section>

          <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Bot className="size-5 text-emerald-400" />
              The Solution: Genuine Conversational Judging
            </h2>
            <p>
              AiNireekshak preserves the original spoken transcript, displays real-time captions with Romanised Hindi where appropriate, and allows participants to correct or repeat misheard statements. A synthetic humanoid AI avatar conducts responsive follow-up questioning to verify technical depth without penalizing accent, gender, appearance, or native language.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
