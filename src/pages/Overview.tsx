import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel, StatCard, OutcomeBadge, SeverityBadge } from "@/components/common";
import { fmtDateShort, machineStatusStyle, relativeTime, telemetryTone } from "@/lib/fmt";
import { ArrowRight, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Overview() {
  const stats = useQuery(api.overview.overviewStats, {});
  const active = useQuery(api.overview.activeIncidentCard, {});
  const feed = useQuery(api.learning.overviewFeed, { limit: 6 });

  const loading =
    stats === undefined || active === undefined || feed === undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Maintenance Intelligence"
        subtitle="Diagnose with current signals. Decide with historical experience."
        actions={
          <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
            <Link to="/diagnostics">
              <Waves className="size-4" />
              Open Diagnostics
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Active incidents"
            value={stats.activeIncidents}
            tone={stats.activeIncidents > 0 ? "critical" : "ok"}
          />
          <StatCard
            label="Machines online"
            value={`${stats.machinesOnline}/${stats.machinesTotal}`}
          />
          <StatCard label="Critical machines" value={stats.criticalMachines} tone="amber" />
          <StatCard label="Resolved today" value={stats.resolvedToday} />
          <StatCard label="Memories stored" value={stats.memoriesStored} tone="signal" />
          <StatCard
            label="Successful recommendations"
            value={stats.successfulRecommendations}
            tone="ok"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Active incident */}
        <section className="rounded-lg border border-red-400/25 bg-card/60 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Active incident</SectionLabel>
            {active && <span className="font-mono text-xs text-muted-foreground">{active.incident.code}</span>}
          </div>

          {!active && !loading && (
            <div className="mt-6 rounded-md border border-border bg-background/40 p-6 text-center">
              <p className="text-sm font-medium text-foreground">No active incidents</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every recorded incident has an outcome. Run the simulation to replay the demo scenario.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to="/simulation">Open Simulation</Link>
              </Button>
            </div>
          )}

          {active && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-bold">{active.machine?.name}</h2>
                <SeverityBadge severity={active.incident.severity} />
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                    machineStatusStyle[active.machine?.status ?? "online"],
                  )}
                >
                  {active.machine?.status?.toUpperCase()}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                <span>{active.incident.errorCode}</span>
                <span>{active.incident.fault}</span>
                <span>Reported {fmtDateShort(active.incident.date)}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <TelemetryTile
                  label="Temperature"
                  value={`${active.incident.telemetry.temperature}`}
                  unit="°C"
                  tone={telemetryTone(active.incident.telemetry.temperature, 80, 90)}
                />
                <TelemetryTile
                  label="Vibration"
                  value={`${active.incident.telemetry.vibration}`}
                  unit="mm/s"
                  tone={telemetryTone(active.incident.telemetry.vibration, 6, 7.5)}
                />
                <TelemetryTile
                  label="Pressure"
                  value={`${active.incident.telemetry.pressure}`}
                  unit="bar"
                  tone={telemetryTone(active.incident.telemetry.pressure, 0, 0)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
                  <Link to={`/diagnostics?incident=${active.incident._id}`}>
                    <Waves className="size-4" />
                    RUN DIAGNOSIS
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/machines/${active.machine?._id}`}>
                    Machine history
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </section>

        {/* Recent learning events */}
        <section className="rounded-lg border border-border bg-card/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Recent learning events</SectionLabel>
            <Link to="/learning" className="text-xs text-signal hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {feed === undefined && (
              <>
                <div className="h-12 animate-pulse rounded-md bg-muted/50" />
                <div className="h-12 animate-pulse rounded-md bg-muted/50" />
                <div className="h-12 animate-pulse rounded-md bg-muted/50" />
              </>
            )}
            {feed?.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No learning events yet — resolve an incident to record the first experience.
              </p>
            )}
            {feed?.map((e) => (
              <div key={e._id} className="border-l-2 border-signal/40 pl-3">
                <p className="text-[13px] font-medium leading-snug">{e.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.detail}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {relativeTime(e.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TelemetryTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <SectionLabel>{label}</SectionLabel>
      <p className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", tone)}>
        {value}
        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
