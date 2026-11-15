"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Award,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/results", label: "Rankings & Export", icon: Award },
  { href: "/admin/settings", label: "Settings & AI Keys", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-white/8 bg-black flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="p-3 space-y-0.5">
        {/* Section label */}
        <div className="px-3 pt-3 pb-2 text-[9px] font-bold tracking-widest uppercase text-zinc-600">
          Admin Portal
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 relative group ${
                isActive
                  ? "text-red-500 bg-red-600/8"
                  : "text-zinc-500 hover:text-zinc-100 hover:bg-white/4"
              }`}
            >
              {/* Active left accent bar */}
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600" />
              )}
              <Icon
                className={`size-4 shrink-0 transition-colors ${
                  isActive ? "text-red-500" : "text-zinc-600 group-hover:text-zinc-400"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer — minimal AI engine status */}
      <div className="mt-auto p-4 border-t border-white/6">
        <div className="flex items-center gap-2.5 px-1">
          <span className="dot-live shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 tracking-wide">AI Engine Active</p>
            <p className="text-[9px] text-zinc-700 mt-0.5">Hindi · Hinglish · English</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
