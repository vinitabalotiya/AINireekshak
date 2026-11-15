"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Video,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowRight,
  Radio,
} from "lucide-react";
import { TeamLayout } from "@/components/layout/team-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeamData() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [tData, subs, sessList] = await Promise.all([
          api.getTeam(user.id),
          api.getTeamSubmissions(user.id),
          api.getSessions({ status: "scheduled" }),
        ]);
        const sList = Array.isArray(sessList) ? sessList : (sessList?.items || []);
        const subList = Array.isArray(subs) ? subs : (subs?.items || []);
        setTeamInfo(tData);
        setSubmissions(subList);
        // Find session for this team
        const mySession = sList.find((s: any) => String(s.team_id) === String(user.id));
        setSession(mySession);
      } catch (err) {
        console.error("Failed to load team dashboard data", err);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }
    loadTeamData();
  }, [user]);

  if (loading) {
    return (
      <TeamLayout>
        <LoadingSpinner message="Loading Team Dashboard..." size="lg" />
      </TeamLayout>
    );
  }

  const subArr = Array.isArray(submissions) ? submissions : [];
  const pptSubmission = subArr.find((s) => s.submission_type === "presentation" || s.submission_type === "ppt");
  const hasPresentation = !!pptSubmission;

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Welcome Banner - White Tone Architectural Participant Pass */}
        <div className="p-6 rounded border border-white bg-white text-black shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest">
                <span className="px-2 py-0.5 border border-red-600 bg-red-600/10 text-red-600 font-bold">
                  Official Participant Pass
                </span>
                <span className="text-zinc-600 font-semibold">Team #{user?.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
                {teamInfo?.name || user?.team_name || "Team BharatAI"}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-mono">
                Project: <strong className="text-black font-bold">{teamInfo?.project_name || "Multilingual AI Solution"}</strong>
              </p>
            </div>

            <Link href="/team/session">
              <Button size="lg" className="h-10 px-5 bg-red-600 hover:bg-black text-white font-medium text-xs font-mono uppercase tracking-wider rounded shadow-md transition-all">
                <span className="dot-live mr-2" />
                Join Live Judging Room
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Info: Session Countdown & Submission Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Judging Room Card */}
          <div className="md:col-span-7 p-6 rounded border border-white/10 bg-zinc-950 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Video className="size-3.5 text-red-500" />
                  Live AI Judging Session
                </h3>
                <StatusBadge status={session ? session.status : "ready"} />
              </div>

              <div className="p-4 rounded bg-black border border-white/8 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Scheduled Duration:</span>
                  <span className="text-white font-semibold">{session?.duration_minutes || 3} Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Speech Modes:</span>
                  <span className="text-zinc-200">Hindi · Hinglish (Roman) · English</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Voice Synthesis:</span>
                  <span className="text-red-400 font-medium">Dual-Engine Active</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-400 leading-relaxed font-sans">
                During your interactive pitch, speak naturally. Captions update in real-time. The AI judge evaluates technical comprehension, architecture choices, and code depth.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/8">
              <Link href="/team/session">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase tracking-wider h-9 rounded">
                  Enter Interactive Judging Stage
                </Button>
              </Link>
            </div>
          </div>

          {/* Submission Readiness Checklist */}
          <div className="md:col-span-5 p-6 rounded border border-white/10 bg-zinc-950 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <FileText className="size-3.5 text-zinc-400" />
                  Submission Status
                </h3>
                <span className="font-mono text-[10px] text-zinc-400">Strict Limit: 1 PPT</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* PPT / PDF Single Submission */}
                <div className="p-3 rounded border border-white/8 bg-black space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {hasPresentation ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : (
                        <Clock className="size-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-semibold text-zinc-200">Presentation Deck</p>
                        <p className="text-[10px] text-zinc-500">.PPTX · .PPT · .PDF (Max 10MB)</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${
                      hasPresentation 
                        ? "border-white bg-white text-black" 
                        : "border-red-600/40 bg-red-600/10 text-red-500"
                    }`}>
                      {hasPresentation ? "1/1 SUBMITTED" : "PENDING (0/1)"}
                    </span>
                  </div>

                  {pptSubmission && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="truncate max-w-[200px] text-zinc-300 font-mono">
                        {pptSubmission.file_name || pptSubmission.title || "Pitch_Deck.pptx"}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {pptSubmission.ai_status || "Analyzed"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Only 1 presentation deck is accepted per team. This file is ingested by AI to generate customized cross-examination questions during your pitch.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/8">
              <Link href="/team/submission">
                <Button variant="outline" className="w-full border-white/15 bg-black hover:border-white/30 text-zinc-300 text-xs font-mono uppercase tracking-wider h-9 rounded">
                  <UploadCloud className="size-3.5 mr-1.5" />
                  Manage Submissions
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        {Array.isArray(teamInfo?.members) && teamInfo.members.length > 0 && (
          <div className="p-5 rounded border border-white/10 bg-zinc-950">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2 mb-3">
              <Users className="size-3.5 text-zinc-500" />
              Registered Team Members ({teamInfo.members.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {teamInfo.members.map((member: any, i: number) => (
                <div key={i} className="p-3 rounded border border-white/8 bg-black text-xs font-mono">
                  <p className="font-semibold text-zinc-200">{member.name}</p>
                  <p className="text-[10px] text-zinc-500">{member.email || "No email provided"}</p>
                  <span className="inline-block mt-1 text-[9px] text-red-500 uppercase tracking-wider font-semibold">
                    {member.role || "Member"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TeamLayout>
  );
}
