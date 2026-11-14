"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, Key, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function TeamLoginPage() {
  const { loginTeam } = useAuth();
  const [teamName, setTeamName] = useState("Team BharatAI");
  const [accessCode, setAccessCode] = useState("TEAM-DEMO-2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginTeam(teamName, accessCode);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Invalid team name or access code. Please confirm with hackathon organizers."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      {/* Glow */}
      <div className="absolute size-96 rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Sparkles className="size-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">AiNireekshak</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-medium">
            <Users className="size-3.5" />
            <span>Participant Team Portal</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Sign in using your team name and unique access code to submit project materials and enter the live AI judging room.
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="team_name" className="text-xs text-slate-300">
                Registered Team Name
              </Label>
              <Input
                id="team_name"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 h-10 text-sm focus:border-emerald-500"
                placeholder="Team Name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="access_code" className="text-xs text-slate-300">
                Secret Access Code
              </Label>
              <Input
                id="access_code"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 h-10 text-sm font-mono focus:border-emerald-500"
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-md shadow-emerald-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Verifying Access Code...
                </>
              ) : (
                "Enter Team Portal"
              )}
            </Button>
          </form>

          {/* Quick Demo Info Box */}
          <div className="mt-6 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Default Demo Team Credentials:</span>
            <div className="mt-1 flex justify-between font-mono text-slate-400">
              <span>Team: <strong className="text-slate-200">Team BharatAI</strong></span>
              <span>Code: <strong className="text-slate-200">TEAM-DEMO-2026</strong></span>
            </div>
          </div>
        </div>

        {/* Link to Admin Login */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Hackathon administrator?{" "}
          <Link href="/admin/login" className="text-blue-400 hover:underline">
            Go to Organizer Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
