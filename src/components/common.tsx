import { cn } from "@/lib/utils";
import {
  outcomeIcon,
  outcomeLabel,
  outcomeStyle,
  severityLabel,
  severityStyle,
  type Outcome,
  type Severity,
} from "@/lib/fmt";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "critical" | "ok" | "signal" | "amber";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    critical: "text-red-400",
    ok: "text-emerald-400",
    signal: "text-signal",
    amber: "text-amber-400",
  };
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <SectionLabel>{label}</SectionLabel>
      <p className={cn("mt-2 font-display text-2xl font-bold tabular-nums", tones[tone])}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function OutcomeBadge({ outcome, className }: { outcome: Outcome; className?: string }) {
  const Icon = outcomeIcon[outcome];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide",
        outcomeStyle[outcome],
        className,
      )}
    >
      <Icon className="size-3" />
      {outcomeLabel[outcome]}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide",
        severityStyle[severity],
        className,
      )}
    >
      {severityLabel[severity]}
    </span>
  );
}

/** Lightweight inline sparkline (SVG polyline) — no chart library overhead. */
export function Sparkline({
  data,
  className,
  strokeClass = "stroke-signal",
  height = 28,
  width = 96,
}: {
  data: number[];
  className?: string;
  strokeClass?: string;
  height?: number;
  width?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 6)).toFixed(1)}`)
    .join(" ");
  const last = data[data.length - 1];
  const lastY = height - 2 - ((last - min) / range) * (height - 6);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-24", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        className={cn("opacity-80", strokeClass)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={width} cy={lastY} r="2" className={cn("fill-current", strokeClass.replace("stroke-", "fill-"))} />
    </svg>
  );
}
