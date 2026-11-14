"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, LogOut, User, Shield, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent">
                AiNireekshak
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Multilingual AI Judge
              </span>
            </div>
          </Link>

          {/* Navigation for Logged In Portals */}
          {isAuthenticated && role === "team" && (
            <nav className="hidden md:flex items-center gap-1 ml-4 text-sm font-medium">
              <Link
                href="/team/dashboard"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/team/submission"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Submissions
              </Link>
              <Link
                href="/team/session"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 border border-blue-800/40 transition-colors"
              >
                <Radio className="size-3.5 animate-pulse text-rose-400" />
                Live Judging Room
              </Link>
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
                {role === "admin" ? (
                  <Shield className="size-3.5 text-blue-400" />
                ) : (
                  <Users className="size-3.5 text-emerald-400" />
                )}
                <span className="font-medium text-slate-200">
                  {user?.team_name || user?.username || "Authenticated"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  ({role})
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                className="h-8 px-2.5 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
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
                  variant="outline"
                  className="h-8 border-slate-700 hover:bg-slate-900 text-slate-200 text-xs"
                >
                  <Users className="size-3.5 mr-1.5 text-emerald-400" />
                  Team Login
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs shadow-md shadow-blue-500/20"
                >
                  <Shield className="size-3.5 mr-1.5" />
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
