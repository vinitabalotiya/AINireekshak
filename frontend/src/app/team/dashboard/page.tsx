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
  Sparkles,
  ArrowRight,
  Radio,
  FileCode2,
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
        setTeamInfo(tData);
        setSubmissions(subs);
        // Find session for this team
        const mySession = sessList.find((s: any) => String(s.team_id) === String(user.id));
        setSession(mySession);
      } catch (err) {
        console.error("Failed to load team dashboard data", err);
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

  const hasPresentation = submissions.some((s) => s.submission_type === "presentation");
  const hasCode = submissions.some((s) => s.submission_type === "code" || s.submission_type === "github");

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-emerald-950/40 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Active Participant Team
                </span>
                <span className="text-xs text-slate-400">• Team #{user?.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                {teamInfo?.name || user?.team_name || "Team BharatAI"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Project: <strong className="text-slate-200">{teamInfo?.project_name || "Multilingual AI Solution"}</strong>
              </p>
            </div>

            <Link href="/team/session">
              <Button size="lg" className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25">
                <Radio className="size-4 mr-2 animate-pulse text-rose-400" />
                Join AI Judging Room
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Info: Session Countdown & Submission Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Judging Room Card */}
          <div className="md:col-span-7 p-6 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Video className="size-4 text-blue-400" />
                  Live AI Judging Session
                </h3>
                <StatusBadge status={session ? session.status : "ready"} />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Scheduled Duration:</span>
                  <span className="font-mono text-slate-200 font-semibold">{session?.duration_minutes || 20} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Supported Languages:</span>
                  <span className="text-emerald-400 font-medium">English, Hindi (हिन्दी), Hinglish</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">AI Avatar Judge:</span>
                  <span className="text-blue-400 font-medium">Synthetic Humanoid Examiner</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                During your interactive pitch, speak naturally. You can correct misheard words in real time. The AI judge evaluates your technical comprehension, architecture choices, and implementation depth.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link href="/team/session">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-9">
                  Launch Interactive Judging Room
                </Button>
              </Link>
            </div>
          </div>

          {/* Submission Readiness Checklist */}
          <div className="md:col-span-5 p-6 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <FileText className="size-4 text-indigo-400" />
                Submission Checklist
              </h3>

              <div className="space-y-3 text-xs">
                {/* PPT / PDF */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-2.5">
                    {hasPresentation ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <Clock className="size-4 text-amber-400" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-200">Pitch Presentation</p>
                      <p className="text-[11px] text-slate-500">PDF or PPTX slides</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasPresentation ? "text-emerald-400" : "text-amber-400"}`}>
                    {hasPresentation ? "Uploaded" : "Pending"}
                  </span>
                </div>

                {/* Source Code */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-2.5">
                    {hasCode ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <Clock className="size-4 text-amber-400" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-200">Source Code Repository</p>
                      <p className="text-[11px] text-slate-500">ZIP archive or GitHub link</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${hasCode ? "text-emerald-400" : "text-amber-400"}`}>
                    {hasCode ? "Uploaded" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link href="/team/submission">
                <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-200 text-xs h-9">
                  <UploadCloud className="size-3.5 mr-1.5" />
                  Upload & Manage Submissions
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        {teamInfo?.members && teamInfo.members.length > 0 && (
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <Users className="size-4 text-slate-400" />
              Registered Team Members ({teamInfo.members.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {teamInfo.members.map((member: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 text-xs">
                  <p className="font-semibold text-slate-200">{member.name}</p>
                  <p className="text-[11px] text-slate-400">{member.email || "No email"}</p>
                  <span className="inline-block mt-1 text-[10px] text-blue-400 font-medium">
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
