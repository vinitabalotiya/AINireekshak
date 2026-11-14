"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Video,
  Award,
  Settings,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/teams", label: "Teams & Codes", icon: Users },
  { href: "/admin/sessions", label: "Sessions", icon: Video },
  { href: "/admin/results", label: "Rankings & Export", icon: Award },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
          Admin Portal
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
              }`}
            >
              <Icon className={`size-4.5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-purple-950/30 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
            <Sparkles className="size-3.5" />
            <span>AI Judge Engine</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            Multilingual synthesis with Hindi, Hinglish & English transcription active.
          </p>
        </div>
      </div>
    </aside>
  );
}
