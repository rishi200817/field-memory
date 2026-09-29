import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleDashed,
} from "lucide-react";

// ---- formatting -----------------------------------------------------------

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase();
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function titleize(s: string): string {
  return s
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---- outcome / severity tokens ---------------------------------------------

export type Outcome = "resolved" | "failed" | "partial" | "open";

export const outcomeStyle: Record<Outcome, string> = {
  resolved: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  failed: "text-red-400 border-red-400/30 bg-red-400/10",
  partial: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  open: "text-sky-400 border-sky-400/30 bg-sky-400/10",
};

export const outcomeDot: Record<Outcome, string> = {
  resolved: "bg-emerald-400",
  failed: "bg-red-400",
  partial: "bg-amber-400",
  open: "bg-sky-400",
};

export const outcomeIcon: Record<Outcome, LucideIcon> = {
  resolved: CircleCheck,
  failed: CircleX,
  partial: CircleAlert,
  open: CircleDashed,
};

export const outcomeLabel: Record<Outcome, string> = {
  resolved: "RESOLVED",
  failed: "FAILED",
  partial: "PARTIAL",
  open: "OPEN",
};

export const outcomeLabelPast: Record<Outcome, string> = {
  resolved: "Resolved",
  failed: "Failed",
  partial: "Partially resolved",
  open: "Open",
};

export type Severity = "critical" | "high" | "medium" | "low";

export const severityStyle: Record<Severity, string> = {
  critical: "text-red-400 border-red-400/30 bg-red-400/10",
  high: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  medium: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  low: "text-slate-300 border-slate-300/25 bg-slate-300/10",
};

export const severityLabel: Record<Severity, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export const machineStatusStyle: Record<string, string> = {
  online: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  degraded: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  offline: "text-red-400 border-red-400/30 bg-red-400/10",
  maintenance: "text-sky-400 border-sky-400/30 bg-sky-400/10",
};

export function telemetryTone(value: number, warn: number, crit: number): string {
  if (value >= crit) return "text-red-400";
  if (value >= warn) return "text-amber-400";
  return "text-foreground";
}

export { AlertTriangle };
