"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  Key,
  ArrowRight,
  Sparkles,
  Settings,
  FileSpreadsheet,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading";
import { ScoreChart } from "@/components/charts/score-chart";
import { api } from "@/services/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [dashStats, keys] = await Promise.all([
          api.getDashboardStats(),
          api.getAIKeySettings(),
        ]);
        setStats(dashStats);
        setAiSettings(keys);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Loading Operations Dashboard..." size="lg" />
      </AdminLayout>
    );
  }

  const isGeminiConfigured = Boolean(aiSettings?.gemini?.configured);

  const statCards = [
    {
      title: "Participating Teams",
      value: stats?.total_teams ?? 0,
      icon: Users,
      color: "text-zinc-300 border-white/10 bg-white/4",
      subtitle: "Registered in system",
    },
    {
      title: "Completed Evaluations",
      value: stats?.completed_sessions ?? 0,
      icon: CheckCircle2,
      color: "text-red-500 border-red-600/30 bg-red-600/10",
      subtitle: "Scorecards finalized",
    },
    {
      title: "Platform Average Score",
      value: `${(stats?.average_score ?? 0).toFixed(1)}/100`,
      icon: TrendingUp,
      color: "text-white bg-black border-black",
      isWhite: true,
      subtitle: "Weighted aggregate",
    },
    {
      title: "AI API Key Storage",
      value: isGeminiConfigured ? "Permanent" : "Demo Mode",
      icon: Key,
      color: isGeminiConfigured
        ? "text-white border-white/20 bg-white/10"
        : "text-red-400 border-red-600/30 bg-red-600/10",
      subtitle: isGeminiConfigured ? "Saved in .env file" : "Add key in Settings",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              <span>Operations & Standings</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">Live AI Evaluation Control</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Operations Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Real-time monitoring of multilingual judging scorecards, standings, and permanently configured AI keys.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/admin/results">
              <Button size="sm" variant="outline" className="border-white/15 bg-black hover:border-white/30 text-xs text-zinc-200 font-mono rounded">
                <Award className="size-3.5 mr-1.5 text-red-500" />
                Rankings & Export
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase tracking-wider rounded">
                <Settings className="size-3.5 mr-1.5" />
                AI API Key Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Card Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card: any, idx) => {
            const Icon = card.icon;
            const isWhite = Boolean(card.isWhite);
            return (
              <div
                key={idx}
                className={`p-4 rounded border font-mono transition-all ${
                  isWhite
                    ? "border-white bg-white text-black shadow-md hover:border-red-600"
                    : "border-white/10 bg-zinc-950 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] uppercase tracking-wider ${isWhite ? "text-zinc-600 font-bold" : "text-zinc-500"}`}>
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded border ${card.color}`}>
                    <Icon className="size-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <p className={`text-2xl font-bold font-mono ${isWhite ? "text-black" : "text-white"}`}>
                    {card.value}
                  </p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isWhite ? "text-red-600" : "text-zinc-500"}`}>
                    {card.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Key Permanent Status Banner */}
        <div className="p-4 rounded border border-white/10 bg-zinc-950 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded border ${isGeminiConfigured ? "border-white/20 bg-white/5 text-white" : "border-red-600/30 bg-red-600/10 text-red-500"}`}>
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-white">
                {isGeminiConfigured
                  ? "Google Gemini API Key: Permanently Configured in .env"
                  : "Google Gemini API Key: Not Configured (Running in Demo Mode)"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isGeminiConfigured
                  ? `Active key (${aiSettings?.gemini?.masked_key || "saved"}) loaded from .env. Persists permanently across server restarts.`
                  : "Store your API key in Settings or directly in your .env file so it never needs to be re-entered."}
              </p>
            </div>
          </div>
          <Link href="/admin/settings">
            <Button size="sm" variant="outline" className="border-white/15 bg-black hover:border-white/30 text-zinc-300 text-xs font-mono h-8">
              <Key className="size-3 mr-1.5 text-red-500" />
              Manage .env Keys
            </Button>
          </Link>
        </div>

        {/* Charts & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Category distribution */}
          <div className="lg:col-span-7">
            <ScoreChart
              title="Average Scores Across Evaluation Criteria"
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

          {/* Leaderboard Standings Preview */}
          <div className="lg:col-span-5 p-5 rounded border border-white/10 bg-zinc-950 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Award className="size-3.5 text-red-500" />
                  Top Ranked Teams
                </h3>
                <Link href="/admin/results" className="text-xs font-mono text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  Full Standings <ArrowRight className="size-3" />
                </Link>
              </div>

              {Array.isArray(stats?.top_teams) && stats.top_teams.length > 0 ? (
                <div className="space-y-2">
                  {stats.top_teams.slice(0, 6).map((team: any, i: number) => {
                    const isFirst = i === 0;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded font-mono text-xs transition-colors ${
                          isFirst
                            ? "bg-white text-black border border-white shadow-sm"
                            : "bg-black text-zinc-300 border border-white/8"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`font-bold w-5 text-center ${isFirst ? "text-red-600 font-black" : "text-red-500"}`}>
                            #{i + 1}
                          </span>
                          <div>
                            <p className={`font-semibold ${isFirst ? "text-black font-bold" : "text-white"}`}>{team.team_name}</p>
                            <p className={`text-[10px] ${isFirst ? "text-zinc-600" : "text-zinc-500"}`}>{team.project_name || "Presentation Pitch"}</p>
                          </div>
                        </div>
                        <span className={`font-bold ${isFirst ? "text-black font-black" : "text-white"}`}>
                          {(team.total_score || 0).toFixed(1)}/100
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-600 font-mono">
                  <p>No evaluations recorded yet.</p>
                  <p className="mt-1 text-[11px]">Completed sessions rank here automatically.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/8">
              <Link href="/admin/results">
                <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-mono uppercase tracking-wider h-9 rounded">
                  <FileSpreadsheet className="size-3.5 mr-1.5 text-red-500" />
                  Export Standings to Excel / CSV
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
