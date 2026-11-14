"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Video,
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { ScoreChart } from "@/components/charts/score-chart";
import { api } from "@/services/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Loading Analytics & Operations..." size="lg" />
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: "Total Registered Teams",
      value: stats?.total_teams ?? 0,
      icon: Users,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Active Events",
      value: stats?.total_events ?? 0,
      icon: Calendar,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Active / Pending Sessions",
      value: (stats?.active_sessions ?? 0) + (stats?.pending_sessions ?? 0),
      icon: Clock,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Completed Evaluations",
      value: stats?.completed_sessions ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Platform Average Score",
      value: `${(stats?.average_score ?? 0).toFixed(1)}/100`,
      icon: TrendingUp,
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Operations Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live monitoring of hackathon events, multilingual judging rooms, and score reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/events">
              <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200">
                <Plus className="size-3.5 mr-1 text-blue-400" />
                New Event
              </Button>
            </Link>
            <Link href="/admin/teams">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                <Users className="size-3.5 mr-1" />
                Manage Teams
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{card.title}</span>
                  <div className={`p-2 rounded-lg border ${card.color}`}>
                    <Icon className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-100 mt-3">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts and Highest Scoring Teams */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Category distribution */}
          <div className="lg:col-span-7">
            <ScoreChart
              title="Average Scores Across Judging Criteria"
              categories={[
                { name: "Pitch & Understanding", score: 82.5, weight: 60 },
                { name: "Presentation (PPT/PDF)", score: 78.0, weight: 15 },
                { name: "Code & Implementation", score: 85.0, weight: 8 },
                { name: "Feasibility & Scale", score: 72.0, weight: 7 },
                { name: "Innovation", score: 88.0, weight: 5 },
                { name: "Problem Relevance", score: 90.0, weight: 5 },
              ]}
            />
          </div>

          {/* Leaderboard preview */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Award className="size-4 text-amber-400" />
                  Top Ranked Teams
                </h3>
                <Link href="/admin/results" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                  View Full Standings <ArrowRight className="size-3" />
                </Link>
              </div>

              {stats?.top_teams && stats.top_teams.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.top_teams.slice(0, 5).map((team: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center">
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{team.team_name}</p>
                          <p className="text-[11px] text-slate-400">{team.project_name || "N/A"}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {(team.total_score || 0).toFixed(1)}/100
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p>No evaluations recorded yet.</p>
                  <p className="mt-1 text-[11px]">Completed judging sessions will rank here automatically.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <Link href="/admin/results">
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-9">
                  Export Standings to Excel / CSV
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Video className="size-4 text-blue-400" />
              Live & Scheduled Judging Sessions
            </h3>
            <Link href="/admin/sessions" className="text-xs text-blue-400 hover:underline">
              View All Sessions
            </Link>
          </div>

          {stats?.recent_sessions && stats.recent_sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-medium">Session ID</th>
                    <th className="pb-2.5 font-medium">Team ID</th>
                    <th className="pb-2.5 font-medium">Event ID</th>
                    <th className="pb-2.5 font-medium">Duration</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recent_sessions.slice(0, 5).map((sess: any) => (
                    <tr key={sess.id} className="text-slate-300">
                      <td className="py-3 font-mono font-medium">#{sess.id}</td>
                      <td className="py-3 font-medium text-slate-200">Team #{sess.team_id}</td>
                      <td className="py-3 text-slate-400">Event #{sess.event_id}</td>
                      <td className="py-3 font-mono">{sess.duration_minutes || 20}m</td>
                      <td className="py-3">
                        <StatusBadge status={sess.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/admin/sessions`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:bg-slate-800">
                            Monitor <ExternalLink className="size-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6">No sessions scheduled.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
