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
 */
export function statusColor(status?: string): { bg: string; text: string; badge: string } {
  switch (status?.toLowerCase()) {
    case "active":
    case "completed":
    case "analyzed":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30",
        text: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      };
    case "scheduled":
    case "waiting":
    case "processing":
    case "uploaded":
      return {
        bg: "bg-amber-500/10 border-amber-500/30",
        text: "text-amber-400",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      };
    case "cancelled":
    case "error":
      return {
        bg: "bg-rose-500/10 border-rose-500/30",
        text: "text-rose-400",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      };
    default:
      return {
        bg: "bg-slate-500/10 border-slate-500/30",
        text: "text-slate-400",
        badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      };
  }
}
