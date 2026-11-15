"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Shield, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-black/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Sharp red square logo — not a generic circle */}
            <div className="size-7 bg-red-600 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs tracking-tighter">AI</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                AiNireekshak
              </span>
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 border border-red-600/40 text-red-500 font-semibold tracking-widest uppercase">
                AI Judge
              </span>
            </div>
          </Link>

          {/* Team navigation */}
          {isAuthenticated && role === "team" && (
            <nav className="hidden md:flex items-center gap-0.5 ml-2">
              <Link
                href="/team/dashboard"
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors relative group"
              >
                Dashboard
                <span className="absolute bottom-0 left-3 right-3 h-px bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
              <Link
                href="/team/submission"
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors relative group"
              >
                Submissions
                <span className="absolute bottom-0 left-3 right-3 h-px bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
              <Link
                href="/team/session"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:text-red-400 border border-red-600/30 hover:border-red-500/50 hover:bg-red-600/5 transition-all"
              >
                <span className="dot-live" />
                Live Judging Room
              </Link>
            </nav>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 border border-white/8 text-xs">
                {role === "admin" ? (
                  <Shield className="size-3 text-red-500" />
                ) : (
                  <Users className="size-3 text-zinc-400" />
                )}
                <span className="font-medium text-zinc-200">
                  {user?.team_name || user?.username || "Authenticated"}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">
                  {role}
                </span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="h-7 px-2.5 text-zinc-500 hover:text-red-500 hover:bg-transparent text-xs transition-colors"
              >
                <LogOut className="size-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/team/login">
                <Button
                  size="sm"
                  className="h-7 bg-white hover:bg-zinc-200 text-black border border-white text-xs font-mono font-semibold transition-all rounded shadow-xs"
                >
                  <Users className="size-3 mr-1.5 text-black" />
                  Team Login
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button
                  size="sm"
                  className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors rounded"
                >
                  <Shield className="size-3 mr-1.5" />
                  Admin Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
