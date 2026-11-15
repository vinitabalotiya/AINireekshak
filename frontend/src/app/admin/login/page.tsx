"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-6 text-white selection:bg-red-600/30">
      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
            <div className="size-8 bg-red-600 flex items-center justify-center text-white font-black text-xs">
              AI
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              AiNireekshak
            </span>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 border border-red-600/40 text-red-500 font-mono text-[10px] tracking-widest uppercase">
            <Shield className="size-3" />
            <span>Administrator Access</span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Sign in to manage hackathons, configure weights, and export certified results.
          </p>
        </div>

        {/* Card */}
        <div className="p-7 rounded border border-white/10 bg-zinc-950">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded border border-red-600/40 bg-red-600/8 text-red-400 text-xs font-mono">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Admin Username or Email
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-black border-white/10 text-white h-9 text-xs focus:border-red-600 focus:ring-red-600/20 rounded font-mono"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black border-white/10 text-white h-9 text-xs focus:border-red-600 focus:ring-red-600/20 rounded font-mono"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 mt-3 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In as Admin"
              )}
            </Button>
          </form>

          {/* Quick-fill credentials card (White Tone Minimalist Note) */}
          <div className="mt-6 p-3.5 rounded border border-white bg-white text-black text-[11px] font-mono shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-600">
                Official Admin Access
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsername("admin");
                  setPassword("admin123");
                }}
                className="text-[10px] font-bold text-red-600 hover:text-black uppercase tracking-wider underline cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>
            <div className="flex justify-between text-zinc-800">
              <span>Username: <strong className="text-black font-bold">admin</strong></span>
              <span>Password: <strong className="text-black font-bold">admin123</strong></span>
            </div>
          </div>
        </div>

        {/* Link to Team Login */}
        <p className="mt-6 text-center text-xs text-zinc-500 font-mono">
          Are you a participating team?{" "}
          <Link href="/team/login" className="text-white hover:text-red-500 underline underline-offset-4 transition-colors">
            Team Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
