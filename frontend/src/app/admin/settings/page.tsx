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
  Key,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // AI API Key configuration state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const checkHealth = async () => {
    try {
      setChecking(true);
      const [res, aiRes] = await Promise.all([
        api.checkHealth(),
        api.getAIKeySettings(),
      ]);
      setHealth(res);
      setAiSettings(aiRes);
    } catch (err) {
      console.error("Health check error", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleTestKey = async (provider: "gemini" | "openai") => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const keyToTest = provider === "gemini" ? geminiKeyInput : openaiKeyInput;
      const res = await api.testAIKey({
        provider,
        api_key: keyToTest || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: err?.response?.data?.detail || "Connection test failed. Check network or key validity.",
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setSaveSuccess(false);
    try {
      const res = await api.updateAIKeys({
        gemini_api_key: geminiKeyInput.trim() ? geminiKeyInput.trim() : undefined,
        openai_api_key: openaiKeyInput.trim() ? openaiKeyInput.trim() : undefined,
      });
      setAiSettings(res.settings);
      setSaveSuccess(true);
      setGeminiKeyInput("");
      setOpenaiKeyInput("");
      await checkHealth();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert("Failed to save API key: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="size-6 text-zinc-400" />
              System Settings &amp; Architecture Status
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Infrastructure connections, AI providers, and administrative credentials.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            disabled={checking}
            className="border-white/15 bg-black text-xs text-zinc-300 font-mono hover:border-white/30 rounded"
          >
            <RefreshCw className={`size-3.5 mr-1.5 text-red-500 ${checking ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        </div>

        {/* AI Engine & API Key Configuration */}
        <div className="p-6 rounded border border-white/10 bg-zinc-950 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Key className="size-4 text-red-500" />
                AI Provider &amp; API Key Connection
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Permanent .env Storage: Keys configured here are saved directly into your <code className="text-zinc-200">.env</code> file, persisting automatically across all server restarts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border flex items-center gap-1.5 ${
                  aiSettings?.gemini?.configured
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-red-600/10 text-red-400 border-red-600/30"
                }`}
              >
                <Sparkles className="size-3 text-red-500" />
                {aiSettings?.gemini?.configured ? "Permanent in .env (Gemini Active)" : "Controlled Demo Mode"}
              </span>
            </div>
          </div>

          {/* Permanent Config Summary Card if Key is Configured */}
          {aiSettings?.gemini?.configured && (
            <div className="p-3.5 rounded border border-white/10 bg-black font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-white shrink-0" />
                <div>
                  <span className="font-semibold text-white">Active Gemini Key: </span>
                  <span className="text-zinc-300 font-bold">{aiSettings.gemini.masked_key}</span>
                  <span className="text-[10px] text-zinc-500 block sm:inline sm:ml-2">
                    (Permanently stored in .env · Auto-loaded on every boot)
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-red-500 bg-red-600/10 border border-red-600/25 px-2 py-0.5 rounded w-fit">
                No Re-entry Needed
              </span>
            </div>
          )}

          <form onSubmit={handleSaveKeys} className="space-y-4 font-mono">
            {/* Google Gemini API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  Google Gemini API Key
                  {aiSettings?.gemini?.configured && (
                    <span className="text-[11px] text-zinc-400 font-mono font-normal">
                      (Current in .env: {aiSettings.gemini.masked_key})
                    </span>
                  )}
                </Label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-red-500 hover:text-red-400 hover:underline flex items-center gap-1"
                >
                  Get Gemini Key <ExternalLink className="size-2.5" />
                </a>
              </div>

              <div className="relative">
                <Input
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder={
                    aiSettings?.gemini?.configured
                      ? "Enter new Gemini API key to update in .env..."
                      : "Paste your Google Gemini API Key (e.g. AIzaSy...)"
                  }
                  className="bg-black border-white/10 pr-10 text-xs font-mono text-white rounded focus:border-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showGeminiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans">
                Saving will write this key directly to <code className="text-zinc-400">.env</code> so you will never need to add it again.
              </p>
            </div>

            {/* Optional OpenAI API Key */}
            <div className="space-y-1.5 pt-1 border-t border-white/8">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">
                  OpenAI API Key (Secondary Provider / Optional)
                  {aiSettings?.openai?.configured && (
                    <span className="text-[11px] text-zinc-400 font-mono font-normal ml-2">
                      (Configured: {aiSettings.openai.masked_key})
                    </span>
                  )}
                </Label>
              </div>
              <div className="relative">
                <Input
                  type={showOpenaiKey ? "text" : "password"}
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  placeholder="Paste OpenAI API Key (optional)"
                  className="bg-black border-white/10 pr-10 text-xs font-mono text-white rounded focus:border-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showOpenaiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Feedback Notifications */}
            {testResult && (
              <div
                className={`p-3 rounded text-xs flex items-start gap-2.5 border font-mono ${
                  testResult.valid
                    ? "bg-white/5 border-white/20 text-white"
                    : "bg-red-600/10 border-red-600/30 text-red-400"
                }`}
              >
                {testResult.valid ? (
                  <CheckCircle2 className="size-4 shrink-0 text-white mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{testResult.valid ? "API Key Verified!" : "Validation Failed"}</p>
                  <p className="text-[11px] opacity-90 mt-0.5 font-sans">{testResult.message}</p>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded text-xs flex items-center gap-2 bg-white/5 border border-white/20 text-white font-mono">
                <Check className="size-4 text-white" />
                <span>API key permanently written to .env file! It will persist across all future sessions.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestKey("gemini")}
                disabled={testingKey || (!geminiKeyInput && !aiSettings?.gemini?.configured)}
                className="border-white/15 bg-black hover:border-white/30 text-xs text-zinc-200 h-9 rounded font-mono"
              >
                <Sparkles className={`size-3.5 mr-1.5 text-red-500 ${testingKey ? "animate-spin" : ""}`} />
                {testingKey ? "Testing Connection..." : "Test Gemini Key"}
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={savingKey || (!geminiKeyInput.trim() && !openaiKeyInput.trim())}
                className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 font-mono uppercase tracking-wider rounded"
              >
                <Save className="size-3.5 mr-1.5" />
                {savingKey ? "Saving to .env..." : "Save Permanently to .env"}
              </Button>
            </div>
          </form>
        </div>

        {/* Infrastructure & Services Status */}
        <div className="p-5 rounded border border-white/10 bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3 font-mono">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
              <Server className="size-3.5 text-red-500" />
              Core Infrastructure Health
            </h3>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-medium border ${
                health?.status === "healthy"
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-red-600/10 text-red-400 border-red-600/30"
              }`}
            >
              {health?.status ? health.status.toUpperCase() : "CHECKING..."}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {/* Database */}
            <div className="p-3 rounded bg-black border border-white/8 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Database Engine</p>
                <p className="text-[10px] text-zinc-500">
                  {health?.services?.database?.type === "sqlite" ? "SQLite Async (Dev Mode)" : "PostgreSQL"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-white text-xs font-medium">
                <CheckCircle2 className="size-3.5 text-white" />
                Connected
              </span>
            </div>

            {/* AI Provider */}
            <div className="p-3 rounded bg-black border border-white/8 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Gemini AI Provider</p>
                <p className="text-[10px] text-zinc-500">
                  {health?.services?.ai?.gemini || "Demo Mode (Mock Synthesis Active)"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                <Sparkles className="size-3.5" />
                Active
              </span>
            </div>

            {/* Real-time WebSockets */}
            <div className="p-3 rounded bg-black border border-white/8 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Live Captions WebSocket</p>
                <p className="text-[10px] text-zinc-500">FastAPI Async Broadcast Manager</p>
              </div>
              <span className="flex items-center gap-1 text-white text-xs font-medium">
                <CheckCircle2 className="size-3.5 text-white" />
                Operational
              </span>
            </div>

            {/* Storage */}
            <div className="p-3 rounded bg-black border border-white/8 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">File &amp; Zip Sandbox Storage</p>
                <p className="text-[10px] text-zinc-500">Safe Static Extraction Active</p>
              </div>
              <span className="flex items-center gap-1 text-white text-xs font-medium">
                <CheckCircle2 className="size-3.5 text-white" />
                Secured
              </span>
            </div>
          </div>
        </div>

        {/* Scoring Weights Default */}
        <div className="p-5 rounded border border-white/10 bg-zinc-950 space-y-3 font-mono">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Sliders className="size-3.5 text-red-500" />
            Standard Baseline Weights
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            The platform initialises every new hackathon with these exact weights, customizable per event:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Pitch &amp; Understanding:</span>
              <p className="text-base font-bold text-red-500 mt-1">60%</p>
            </div>
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Presentation Material:</span>
              <p className="text-base font-bold text-white mt-1">15%</p>
            </div>
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Code &amp; Implementation:</span>
              <p className="text-base font-bold text-white mt-1">8%</p>
            </div>
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Feasibility &amp; Scale:</span>
              <p className="text-base font-bold text-white mt-1">7%</p>
            </div>
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Innovation:</span>
              <p className="text-base font-bold text-red-500 mt-1">5%</p>
            </div>
            <div className="p-2.5 rounded bg-black border border-white/8">
              <span className="text-zinc-500 text-[10px] uppercase block">Problem Relevance:</span>
              <p className="text-base font-bold text-white mt-1">5%</p>
            </div>
          </div>
        </div>

        {/* Administrator Profile */}
        <div className="p-5 rounded border border-white/10 bg-zinc-950 space-y-3 font-mono">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="size-3.5 text-zinc-500" />
            Current Authenticated Administrator
          </h3>
          <div className="p-3 rounded bg-black border border-white/8 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-white">{user?.username || "admin"}</p>
              <p className="text-[10px] text-zinc-500">{user?.email || "admin@ainireekshak.com"}</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 text-[10px] uppercase">
              Role: System Administrator
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
