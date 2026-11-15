"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "@/contexts/auth-context";
import { LoadingSpinner } from "@/components/shared/loading";

export function TeamLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "team")) {
      router.push("/team/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner message="Authenticating Team..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
