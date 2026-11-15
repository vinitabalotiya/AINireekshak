"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading";

export default function AdminEventsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return <LoadingSpinner message="Redirecting to Operations Dashboard..." size="lg" />;
}
