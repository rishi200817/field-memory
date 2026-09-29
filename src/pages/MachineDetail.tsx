import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel, OutcomeBadge, SeverityBadge } from "@/components/common";
import { fmtDate, fmtDateTime, machineStatusStyle, telemetryTone } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import { Waves } from "lucide-react";

function TelemetryChart({
  title,
  unit,
  data,
  strokeClass,
}: {
  title: string;
  unit: string;
  data: number[];
  strokeClass: string;
}) {
  const w = 320;
  const h = 72;
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(h - 4 - ((v - min) / range) * (h - 10)).toFixed(1)}`,
    )
    .join(" ");
  const areaPts = `0,${h} ${pts} ${w},${h}`;
  const last = data[data.length - 1];

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel>{title}</SectionLabel>
        <p className="font-mono text-sm font-semibold tabular-nums">
          {last}
          <span className="text-[10px] text-muted-foreground"> {unit}</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-18 w-full" preserveAspectRatio="none">
        <polygon points={areaPts} className={cn(strokeClass, "opacity-10")} />
        <polyline
          points={pts}
          fill="none"
          strokeWidth="1.5"
          className={cn(strokeClass, "opacity-90")}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>min {min}</span>
        <span>max {max}</span>
      </div>
    </div>
  );
}

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useQuery(api.machines.getMachine, id ? { id: id as any } : "skip");

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted/50" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-lg border border-border bg-card/40" />
          <div className="h-48 animate-pulse rounded-lg border border-border bg-card/40" />
          <div className="h-48 animate-pulse rounded-lg border border-border bg-card/40" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Machine not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The machine you requested does not exist in this plant.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/machines">Back to machines</Link>
        </Button>
      </div>
    );
  }

  const { machine, incidents, memories } = data;
  const openIncidents = incidents.filter((i) => i.status === "open");
  const primary = openIncidents[0] ?? incidents[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 font-mono text-xs text-muted-foreground">
        <Link to="/machines" className="hover:text-foreground">
          Machines
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{machine.code}</span>
      </div>

      <PageHeader
        title={machine.name}
        subtitle={`${machine.type} · ${machine.location} · ${machine.manufacturer} · installed ${machine.installedYear}`}
        actions={
          <>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] font-semibold",
                machineStatusStyle[machine.status],
              )}
            >
              {machine.status.toUpperCase()}
            </span>
            {machine.critical && <SeverityBadge severity="critical" />}
            {primary && (
              <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
                <Link to={`/diagnostics?incident=${primary._id}`}>
                  <Waves className="size-4" />
                  Run diagnosis
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <TelemetryChart
          title="Temperature"
          unit="°C"
          data={machine.telemetryHistory.temperature}
          strokeClass="stroke-red-400"
        />
        <TelemetryChart
          title="Vibration"
          unit="mm/s"
          data={machine.telemetryHistory.vibration}
          strokeClass="stroke-amber-400"
        />
        <TelemetryChart
          title="Pressure"
          unit="bar"
          data={machine.telemetryHistory.pressure}
          strokeClass="stroke-sky-400"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Current telemetry + metadata */}
        <section className="rounded-lg border border-border bg-card/60 p-5 lg:col-span-2">
          <SectionLabel>Current telemetry</SectionLabel>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className={cn("font-mono text-xl font-semibold tabular-nums", telemetryTone(machine.telemetry.temperature, 80, 90))}>
                {machine.telemetry.temperature}°C
              </p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
            <div>
              <p className={cn("font-mono text-xl font-semibold tabular-nums", telemetryTone(machine.telemetry.vibration, 6, 7.5))}>
                {machine.telemetry.vibration} mm/s
              </p>
              <p className="text-xs text-muted-foreground">Vibration</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold tabular-nums">{machine.telemetry.pressure} bar</p>
              <p className="text-xs text-muted-foreground">Pressure</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-border/60 pt-4 font-mono text-xs">
            <Row k="Asset number" v={machine.assetNumber} />
            <Row k="Operating hours" v={`${machine.operatingHours.toLocaleString()} h`} />
            <Row k="Last service" v={fmtDate(machine.lastService)} />
            <Row k="Incident count" v={String(incidents.length)} />
            <Row k="Open incidents" v={String(openIncidents.length)} />
          </div>
        </section>

        {/* Incident history */}
        <section className="rounded-lg border border-border bg-card/60 p-5 lg:col-span-3">
          <SectionLabel>Historical incidents</SectionLabel>
          <div className="fm-scroll mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {incidents.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No incidents recorded for this machine.
              </p>
            )}
            {incidents.map((i) => (
              <Link
                key={i._id}
                to={`/incidents/${i._id}`}
                className="block rounded-md border border-border/70 bg-background/40 p-3 transition-colors hover:border-signal/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
                    <OutcomeBadge outcome={i.status} />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {fmtDateTime(i.date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{i.fault}</span>
                  <span className="font-mono text-xs text-muted-foreground">{i.errorCode}</span>
                  {i.severity === "critical" && <SeverityBadge severity="critical" />}
                </div>
                {i.action && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Action: {i.action}
                    {i.technician ? ` · ${i.technician}` : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Memories for this machine */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Relevant memories — {machine.code}</SectionLabel>
          <Link to="/memory" className="text-xs text-signal hover:underline">
            Open memory explorer
          </Link>
        </div>
        {memories.length === 0 ? (
          <p className="mt-3 py-4 text-center text-sm text-muted-foreground">
            No experiences retained for this machine yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((m) => (
              <Link
                key={m._id}
                to={`/memory/${m._id}`}
                className="rounded-md border border-border/70 bg-background/40 p-3 transition-colors hover:border-signal/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {fmtDate(m.timestamp)}
                  </span>
                  <OutcomeBadge outcome={m.outcome} />
                </div>
                <p className="mt-1.5 text-sm font-medium">{m.action}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.learning}</p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">{m.code}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
