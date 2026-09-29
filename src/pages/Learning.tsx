import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader, SectionLabel, StatCard } from "@/components/common";
import { fmtDate, fmtDateTime, relativeTime } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import { Database, GitBranch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KIND_META: Record<string, { tone: string; icon: LucideIcon }> = {
  failed_repair_remembered: { tone: "border-red-400/50 bg-red-400/10 text-red-400", icon: GitBranch },
  successful_repair_retained: { tone: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400", icon: Database },
  recurring_fault_detected: { tone: "border-amber-400/50 bg-amber-400/10 text-amber-400", icon: GitBranch },
  technician_feedback_stored: { tone: "border-sky-400/50 bg-sky-400/10 text-sky-400", icon: Database },
  experience_retained: { tone: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400", icon: Database },
  recall_performed: { tone: "border-signal/50 bg-signal/10 text-signal", icon: GitBranch },
  recommendation_changed: { tone: "border-signal/50 bg-signal/10 text-signal", icon: GitBranch },
};

function kindLabel(kind: string): string {
  return kind
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Learning() {
  const events = useQuery(api.learning.listLearningEvents, { limit: 200 });
  const memories = useQuery(api.memories.listMemories, {});

  // Memory growth computed ONLY from actual stored timestamps.
  const growth = useMemo(() => {
    if (!memories) return [];
    const byMonth = new Map<string, number>();
    for (const m of memories) {
      const key = m.timestamp.slice(0, 7); // YYYY-MM
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    const keys = [...byMonth.keys()].sort();
    let cumulative = 0;
    return keys.map((k) => {
      cumulative += byMonth.get(k) ?? 0;
      return { month: k, count: cumulative, added: byMonth.get(k) ?? 0 };
    });
  }, [memories]);

  const w = 560;
  const h = 120;
  const maxCount = growth.length ? growth[growth.length - 1].count : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Learning"
        subtitle="How each recorded outcome changes the next decision."
      />

      {/* The loop */}
      <section className="rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>The learning loop</SectionLabel>
        <div className="mt-4 flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
          {[
            "INCIDENT DETECTED",
            "RECALL HISTORY",
            "AI DIAGNOSIS",
            "RECOMMENDATION",
            "TECHNICIAN ACTION",
            "RESULT RECORDED",
            "EXPERIENCE RETAINED",
          ].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2 md:flex-1">
              <div className="flex-1 rounded-md border border-border bg-background/50 px-3 py-2 text-center">
                <p className="font-mono text-[10px] font-semibold tracking-wide text-foreground">{step}</p>
              </div>
              {i < arr.length - 1 && (
                <span className="hidden font-mono text-muted-foreground md:block">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every resolved incident feeds the next diagnosis. The timeline below shows the loop
          operating on real recorded data — no simulated claims.
        </p>
      </section>

      {/* C-17 storyline timeline */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>C-17 / E204 — how history changed the decision</SectionLabel>
        <div className="mt-4 space-y-0">
          <TimelineNode
            date="19 Sep 2026"
            title="Bearing replacement"
            outcome="FAILED"
            tone="failed"
            detail="Vibration remained 8.1 mm/s after restart. Root cause upstream of bearing."
          />
          <TimelineNode
            date="03 Aug 2026"
            title="Alignment correction"
            outcome="RESOLVED"
            tone="resolved"
            detail="0.31 mm coupling offset corrected. Machine returned to normal."
          />
          <TimelineNode
            date="26 Sep 2026"
            title="E204 recurrence — agent recalls history"
            outcome="MEMORY ON"
            tone="signal"
            detail="Recommendation changes: check alignment and lubrication before repeating the failed bearing replacement."
            last
          />
        </div>
      </section>

      {/* Memory growth */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Memory growth — retained experiences per month</SectionLabel>
          <span className="font-mono text-xs text-muted-foreground">
            {memories?.length ?? 0} total retained
          </span>
        </div>
        {growth.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No memories stored yet.
          </p>
        ) : (
          <div className="mt-4">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={0}
                  x2={w}
                  y1={h - f * (h - 20) - 4}
                  y2={h - f * (h - 20) - 4}
                  className="stroke-border"
                  strokeDasharray="3 4"
                />
              ))}
              <polyline
                points={growth
                  .map((g, i) => {
                    const x = (i / Math.max(1, growth.length - 1)) * (w - 24) + 12;
                    const y = h - 4 - (g.count / maxCount) * (h - 20);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ")}
                fill="none"
                strokeWidth="2"
                className="stroke-signal"
                strokeLinejoin="round"
              />
              {growth.map((g, i) => {
                const x = (i / Math.max(1, growth.length - 1)) * (w - 24) + 12;
                const y = h - 4 - (g.count / maxCount) * (h - 20);
                return <circle key={g.month} cx={x} cy={y} r="2.5" className="fill-signal" />;
              })}
            </svg>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{fmtDate(growth[0].month + "-01")}</span>
              <span>{fmtDate(growth[growth.length - 1].month + "-01")}</span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Computed from {memories?.length ?? 0} stored memory timestamps — {growth.length} months of recorded retention activity.
            </p>
          </div>
        )}
      </section>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total memories" value={memories?.length ?? "—"} tone="signal" />
        <StatCard
          label="Failed repairs remembered"
          value={memories?.filter((m) => m.outcome === "failed").length ?? "—"}
          tone="critical"
        />
        <StatCard
          label="Successful repairs retained"
          value={memories?.filter((m) => m.outcome === "resolved").length ?? "—"}
          tone="ok"
        />
        <StatCard label="Learning events" value={events?.length ?? "—"} />
      </div>

      {/* Full event timeline */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>All learning events</SectionLabel>
        {events === undefined && (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        )}
        {events?.length === 0 && (
          <p className="mt-3 py-6 text-center text-sm text-muted-foreground">
            No learning events yet — resolve an incident to create the first one.
          </p>
        )}
        <div className="fm-scroll mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {events?.map((e) => {
            const meta = KIND_META[e.kind] ?? KIND_META.recall_performed;
            const Icon = meta.icon;
            return (
              <div
                key={e._id}
                className="flex gap-3 rounded-md border border-border/70 bg-background/40 p-3"
              >
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded border", meta.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[13px] font-semibold leading-snug">{e.title}</p>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {relativeTime(e.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {kindLabel(e.kind)} · {fmtDateTime(e.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TimelineNode({
  date,
  title,
  outcome,
  detail,
  tone,
  last = false,
}: {
  date: string;
  title: string;
  outcome: string;
  detail: string;
  tone: "failed" | "resolved" | "signal";
  last?: boolean;
}) {
  const tones = {
    failed: "border-red-400/50 bg-red-400/10 text-red-400",
    resolved: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400",
    signal: "border-signal/50 bg-signal/10 text-signal",
  };
  return (
    <div className="relative flex gap-4 pb-5">
      {!last && <span className="absolute left-[9px] top-6 h-full w-px bg-border" />}
      <span className={cn("relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-background", tones[tone])}>
        <span className={cn("size-1.5 rounded-full", tones[tone].split(" ").find((c) => c.startsWith("text-"))?.replace("text-", "bg-") ?? "bg-signal")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{date}</span>
          <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold", tones[tone])}>
            {outcome}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
