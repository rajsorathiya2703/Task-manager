import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
];

export function avatarColor(str: string): string {
  if (!str) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function statusStyles(status?: string): { label: string; badge: string; dot: string } {
  const s = (status || "To Do").trim();
  const lower = s.toLowerCase();

  if (lower === "completed" || lower === "done") {
    return {
      label: s || "Completed",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      dot: "bg-emerald-500",
    };
  }
  if (lower === "doing" || lower === "in progress" || lower === "in-progress") {
    return {
      label: s || "In Progress",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
      dot: "bg-blue-500",
    };
  }
  if (lower === "on hold" || lower === "on-hold" || lower === "review") {
    return {
      label: s || "On Hold",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      dot: "bg-amber-500",
    };
  }
  return {
    label: s || "To Do",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
    dot: "bg-slate-400",
  };
}

export function priorityStyles(priority?: string): { label: string; badge: string } {
  const p = (priority || "No Priority").trim();
  const lower = p.toLowerCase();

  if (lower === "high" || lower === "urgent") {
    return {
      label: p || "High",
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    };
  }
  if (lower === "medium") {
    return {
      label: "Medium",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    };
  }
  if (lower === "low") {
    return {
      label: "Low",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    };
  }
  return {
    label: p || "No Priority",
    badge: "bg-muted text-muted-foreground border border-border/60",
  };
}

export function formatDisplayDate(dateStr?: string | null, endDateStr?: string | null): string {
  if (!dateStr && !endDateStr) return "";

  if (dateStr && endDateStr && dateStr !== endDateStr) {
    try {
      const s = new Date(dateStr);
      const e = new Date(endDateStr);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sFormatted = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const eFormatted = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `${sFormatted} - ${eFormatted}`;
      }
    } catch { }
  }

  const target = dateStr || endDateStr;
  try {
    const d = new Date(target!);
    if (isNaN(d.getTime())) return target!;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return target!;
  }
}

/**
 * Normalizes a URL by ensuring external schemes exist.
 * Preserves links with existing schemes (http, https, mailto, tel) and internal relative paths.
 * Prepends https:// to scheme-less inputs (e.g. "google.com" -> "https://google.com").
 */
export function normalizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}
