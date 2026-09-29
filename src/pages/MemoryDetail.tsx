import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel, OutcomeBadge } from "@/components/common";
import { fmtDateTime } from "@/lib/fmt";

export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useQuery(api.memories.getMemory, id ? { id: id as any } : "skip");

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-72 animate-pulse rounded bg-muted/50" />
        <div className="mt-6 h-64 animate-pulse rounded-lg border border-border bg-card/40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Memory not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This experience does not exist or was removed from the memory layer.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/memory">Back to memory explorer</Link>
        </Button>
      </div>
    );
  }

  const { memory, machine, incident, related } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 font-mono text-xs text-muted-foreground">
        <Link to="/memory" className="hover:text-foreground">Memory</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{memory.code}</span>
      </div>

      <PageHeader
        title={memory.action}
        subtitle={`${machine?.name ?? ""} · ${memory.fault} (${memory.errorCode})`}
        actions={<OutcomeBadge outcome={memory.outcome} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card/60 p-5">
          <SectionLabel>Experience record</SectionLabel>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <Row k="Memory ID" v={memory.code} />
            <Row k="Machine" v={machine?.name ?? "—"} />
            <Row k="Fault" v={`${memory.fault} (${memory.errorCode})`} />
            <Row k="Outcome" v={memory.outcome.toUpperCase()} />
            <Row k="Technician" v={memory.technician} />
            <Row k="Timestamp" v={fmtDateTime(memory.timestamp)} />
            <Row k="Source" v={memory.source} />
            {memory.externalId && <Row k="Hindsight ID" v={memory.externalId} />}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/60 p-5">
          <SectionLabel>Symptoms at time of incident</SectionLabel>
          <ul className="mt-3 space-y-1.5">
            {memory.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                {s}
              </li>
            ))}
          </ul>
          {incident && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="text-xs text-muted-foreground">Source incident</p>
              <Link
                to={`/incidents/${incident._id}`}
                className="mt-1 inline-block font-mono text-xs text-signal hover:underline"
              >
                {incident.code} — {incident.fault}
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-signal/30 bg-signal/5 p-5">
        <SectionLabel>Diagnosis</SectionLabel>
        <p className="mt-2 text-sm leading-relaxed">{memory.diagnosis}</p>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>Technician notes</SectionLabel>
        <p className="mt-2 rounded-md border border-border/70 bg-background/40 p-3 text-sm italic">
          “{memory.technicianNotes}”
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-5">
        <SectionLabel>What was learned</SectionLabel>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{memory.learning}</p>
      </section>

      <section className="mt-4">
        <SectionLabel>Related experiences</SectionLabel>
        {related.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No related experiences found.</p>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.memoryId}
                to={`/memory/${r.memoryId}`}
                className="rounded-md border border-border bg-card/60 p-3 transition-colors hover:border-signal/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">{r.memoryCode}</span>
                  <span
                    className={
                      r.outcome === "failed"
                        ? "rounded border border-red-400/30 bg-red-400/10 px-1 font-mono text-[9px] font-bold text-red-400"
                        : r.outcome === "resolved"
                          ? "rounded border border-emerald-400/30 bg-emerald-400/10 px-1 font-mono text-[9px] font-bold text-emerald-400"
                          : "rounded border border-amber-400/30 bg-amber-400/10 px-1 font-mono text-[9px] font-bold text-amber-400"
                    }
                  >
                    {r.outcome.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{r.action}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  relevance {Math.round(r.relevance)}%
                </p>
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
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="max-w-52 truncate text-right font-semibold">{v}</span>
    </div>
  );
}
