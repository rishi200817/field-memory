import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel, OutcomeBadge, SeverityBadge } from "@/components/common";
import { fmtDateTime, telemetryTone } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import { Waves } from "lucide-react";

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useQuery(api.incidents.getIncident, id ? { id: id as any } : "skip");

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-72 animate-pulse rounded bg-muted/50" />
        <div className="mt-6 h-64 animate-pulse rounded-lg border border-border bg-card/40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Incident not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This incident does not exist or was removed.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/incidents">Back to incidents</Link>
        </Button>
      </div>
    );
  }

  const { incident, machine, diagnoses } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 font-mono text-xs text-muted-foreground">
        <Link to="/incidents" className="hover:text-foreground">Incidents</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{incident.code}</span>
      </div>

      <PageHeader
        title={incident.fault}
        subtitle={`${machine?.name ?? incident.code} · ${incident.errorCode}`}
        actions={
          <>
            <OutcomeBadge outcome={incident.status} />
            <SeverityBadge severity={incident.severity} />
            <Button asChild size="sm" className="bg-signal text-signal-foreground hover:bg-signal/90">
              <Link to={`/diagnostics?incident=${incident._id}`}>
                <Waves className="size-4" />
                Diagnose
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card/60 p-5">
          <SectionLabel>Incident record</SectionLabel>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <Row k="Incident ID" v={incident.code} />
            <Row k="Machine" v={machine?.name ?? "—"} />
            <Row k="Date" v={fmtDateTime(incident.date)} />
            <Row k="Error code" v={incident.errorCode} />
            <Row k="Severity" v={incident.severity.toUpperCase()} />
            <Row k="Status" v={incident.status.toUpperCase()} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/60 p-5">
          <SectionLabel>Telemetry at time of fault</SectionLabel>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className={cn("font-mono text-xl font-semibold tabular-nums", telemetryTone(incident.telemetry.temperature, 80, 90))}>
                {incident.telemetry.temperature}°C
              </p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
            <div>
              <p className={cn("font-mono text-xl font-semibold tabular-nums", telemetryTone(incident.telemetry.vibration, 6, 7.5))}>
                {incident.telemetry.vibration} mm/s
              </p>
              <p className="text-xs text-muted-foreground">Vibration</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold tabular-nums">{incident.telemetry.pressure} bar</p>
              <p className="text-xs text-muted-foreground">Pressure</p>
            </div>
          </div>
        </section>
      </div>

      {/* Repair record */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>Repair record</SectionLabel>
        {incident.action ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Action taken</p>
                <p className="mt-0.5 text-sm font-medium">{incident.action}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Technician</p>
                <p className="mt-0.5 text-sm font-medium">{incident.technician ?? "—"}</p>
              </div>
            </div>
            {incident.technicianNotes && (
              <div>
                <p className="text-xs text-muted-foreground">Technician notes</p>
                <p className="mt-1 rounded-md border border-border/70 bg-background/40 p-3 text-sm italic text-foreground">
                  “{incident.technicianNotes}”
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No repair recorded yet — this incident is open.{" "}
            <Link to={`/diagnostics?incident=${incident._id}`} className="text-signal hover:underline">
              Run a diagnosis and record the repair.
            </Link>
          </p>
        )}
      </section>

      {/* Diagnosis history */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>Diagnosis runs</SectionLabel>
        {diagnoses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No diagnosis has been run for this incident yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {diagnoses.map((d) => (
              <div
                key={d._id}
                className={cn(
                  "rounded-md border p-4",
                  d.memoryUsed ? "border-signal/40 bg-signal/5" : "border-border bg-background/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider",
                      d.memoryUsed ? "bg-signal text-signal-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {d.memoryUsed ? "MEMORY ON" : "MEMORY OFF"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {fmtDateTime(new Date(d.createdAt).toISOString())}
                    {d.usedLLM ? " · LLM" : " · rules fallback"}
                  </span>
                </div>
                <p className="mt-2 text-sm">{d.experienceDiagnosis ?? d.generalDiagnosis}</p>
                {d.recalledSummary && (
                  <p className="mt-2 font-mono text-[11px] text-signal">{d.recalledSummary}</p>
                )}
                <p className="mt-1 text-xs italic text-muted-foreground">{d.caveat}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Linked memory */}
      {incident.memoryId && (
        <section className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-5">
          <SectionLabel>Retained experience</SectionLabel>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground">
              This incident&apos;s outcome was retained as a memory unit.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to={`/memory/${incident.memoryId}`}>Open memory detail</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
