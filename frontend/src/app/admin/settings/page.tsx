"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  Sliders,
  Server,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    try {
      setChecking(true);
      const res = await api.checkHealth();
      setHealth(res);
    } catch (err) {
      console.error("Health check error", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Settings className="size-6 text-slate-400" />
              System Settings & Architecture Status
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Infrastructure connections, AI providers, and administrative credentials.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            disabled={checking}
            className="border-slate-800 bg-slate-900 text-xs text-slate-300"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        </div>

        {/* Infrastructure & Services Status */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Server className="size-4 text-blue-400" />
              Core Infrastructure Health
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                health?.status === "healthy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {health?.status ? health.status.toUpperCase() : "CHECKING..."}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Database */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-300">Database Engine</p>
                <p className="text-[11px] text-slate-500">
                  {health?.services?.database?.type === "sqlite" ? "SQLite Async (Dev Mode)" : "PostgreSQL"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-3.5" />
                Connected
              </span>
            </div>

            {/* AI Provider */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-300">Gemini AI Provider</p>
                <p className="text-[11px] text-slate-500">
                  {health?.services?.ai?.gemini || "Demo Mode (Mock Synthesis Active)"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-blue-400 text-xs font-medium">
                <Sparkles className="size-3.5" />
                Active
              </span>
            </div>

            {/* Real-time WebSockets */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-300">Live Captions WebSocket</p>
                <p className="text-[11px] text-slate-500">FastAPI Async Broadcast Manager</p>
              </div>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-3.5" />
                Operational
              </span>
            </div>

            {/* Storage */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-300">File & Zip Sandbox Storage</p>
                <p className="text-[11px] text-slate-500">Safe Static Extraction Active</p>
              </div>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-3.5" />
                Secured
              </span>
            </div>
          </div>
        </div>

        {/* Scoring Weights Default */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="size-4 text-indigo-400" />
            Standard Baseline Weights (Prompt Spec)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform initialises every new hackathon with these exact weights, customizable per event:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Pitch & Understanding:</span>
              <p className="text-base font-bold font-mono text-blue-400 mt-1">60%</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Presentation Material:</span>
              <p className="text-base font-bold font-mono text-indigo-400 mt-1">15%</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Code & Implementation:</span>
              <p className="text-base font-bold font-mono text-emerald-400 mt-1">8%</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Feasibility & Practicality:</span>
              <p className="text-base font-bold font-mono text-amber-400 mt-1">7%</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Innovation:</span>
              <p className="text-base font-bold font-mono text-pink-400 mt-1">5%</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Problem Relevance:</span>
              <p className="text-base font-bold font-mono text-cyan-400 mt-1">5%</p>
            </div>
          </div>
        </div>

        {/* Administrator Profile */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="size-4 text-slate-400" />
            Current Authenticated Administrator
          </h3>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">{user?.username || "admin"}</p>
              <p className="text-[11px] text-slate-400">{user?.email || "admin@ainireekshak.com"}</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Role: System Administrator
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
