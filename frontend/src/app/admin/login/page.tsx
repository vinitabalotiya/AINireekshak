"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLoginPage() {
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAdmin(username, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid admin credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      {/* Background glow */}
      <div className="absolute size-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="size-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">AiNireekshak</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-blue-400 font-medium">
            <Shield className="size-3.5" />
            <span>Administrator Access</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Sign in to manage hackathons, configure scoring criteria, and export evaluations.
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
              <Label htmlFor="username" className="text-xs text-slate-300">
                Admin Username or Email
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 h-10 text-sm focus:border-blue-500"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 h-10 text-sm focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-md shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                "Sign In as Admin"
              )}
            </Button>
          </form>

          {/* Quick Demo Info Box */}
          <div className="mt-6 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Default Dev Credentials:</span>
            <div className="mt-1 flex justify-between font-mono text-slate-400">
              <span>Username: <strong className="text-slate-200">admin</strong></span>
              <span>Password: <strong className="text-slate-200">admin123</strong></span>
            </div>
          </div>
        </div>

        {/* Link to Team Login */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Are you a participating team?{" "}
          <Link href="/team/login" className="text-blue-400 hover:underline">
            Go to Team Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
