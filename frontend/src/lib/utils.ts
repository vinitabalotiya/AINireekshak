export { cn } from "cn";

/**
 * Format ISO date string into readable format.
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format numerical score out of 100 with 1 decimal.
 */
export function formatScore(score?: number | null): string {
  if (score === undefined || score === null) return "—";
  return `${Number(score).toFixed(1)}/100`;
}

/**
 * Return Tailwind color classes based on lifecycle status.
 * Theme: Black / White / Red only.
 */
export function statusColor(status?: string): { bg: string; text: string; badge: string } {
  switch (status?.toLowerCase()) {
    case "active":
    case "ongoing":
    case "in_progress":
    case "live":
      return {
        bg: "bg-red-600/8 border-red-600/30",
        text: "text-red-500",
        badge: "bg-red-600/10 text-red-400 border-red-600/30",
      };
    case "completed":
    case "analyzed":
    case "done":
    case "passed":
      return {
        bg: "bg-white/8 border-white/20",
        text: "text-white",
        badge: "bg-white/10 text-zinc-100 border-white/20",
      };
    case "scheduled":
    case "waiting":
    case "pending":
      return {
        bg: "bg-white/4 border-white/10",
        text: "text-zinc-400",
        badge: "bg-white/5 text-zinc-400 border-white/10",
      };
    case "processing":
    case "uploaded":
      return {
        bg: "bg-white/4 border-white/10",
        text: "text-zinc-300",
        badge: "bg-white/5 text-zinc-300 border-white/10",
      };
    case "cancelled":
    case "missed":
    case "errored":
      return {
        bg: "bg-zinc-900 border-zinc-700",
        text: "text-zinc-500",
        badge: "bg-zinc-900 text-zinc-500 border-zinc-700",
      };
    case "failed":
    case "error":
    case "flagged":
    case "liveness_failed":
      return {
        bg: "bg-red-600/10 border-red-600/40",
        text: "text-red-500",
        badge: "bg-red-600/10 text-red-400 border-red-600/40",
      };
    default:
      return {
        bg: "bg-white/4 border-white/10",
        text: "text-zinc-500",
        badge: "bg-white/5 text-zinc-500 border-white/10",
      };
  }
}
