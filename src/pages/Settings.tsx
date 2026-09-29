import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader, SectionLabel } from "@/components/common";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert } from "lucide-react";

export default function Settings() {
  // The provider status comes from the server, which is the only place that
  // can see HINDSIGHT_API_URL / HINDSIGHT_API_KEY. Nothing is exposed here.
  const integration = useQuery(api.settings.publicStatus, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        subtitle="Environment, integrations and demo data controls."
      />

      <section className="rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>Memory provider — Hindsight</SectionLabel>
        <div className="mt-3 space-y-3">
          <StatusRow
            ok={integration?.hindsightConfigured ?? false}
            okText="Hindsight API configured — retain and recall use the remote provider"
            badText="HINDSIGHT_API_URL / HINDSIGHT_API_KEY not set — the local development adapter is serving the same interface"
          />
          <div className="rounded-md border border-border bg-background/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <p>retain() → {integration?.hindsightConfigured ? "Hindsight POST /retain" : "local adapter (Convex)"}</p>
            <p>recall() → {integration?.hindsightConfigured ? "Hindsight GET /recall" : "local adapter (deterministic ranking)"}</p>
            <p>getMemory() → Convex memories table (always local source of truth)</p>
          </div>
          <p className="text-xs text-muted-foreground">
            API keys live in server environment variables only. They are never sent to the browser.
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>AI provider</SectionLabel>
        <div className="mt-3 space-y-3">
          <StatusRow
            ok={integration?.aiConfigured ?? false}
            okText="Server-side AI integration available — diagnoses are generated with the LLM"
            badText="AI integration unavailable — deterministic rules-based fallback generates diagnoses"
          />
          <p className="text-xs text-muted-foreground">
            Every diagnosis path (LLM or rules) is grounded in the same recalled experiences, so
            the memory-on/memory-off comparison remains valid in either mode.
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <SectionLabel>Demo data</SectionLabel>
        <div className="mt-3 space-y-2 font-mono text-xs">
          <Row k="Machines" v={String(integration?.counts.machines ?? "—")} />
          <Row k="Incidents" v={String(integration?.counts.incidents ?? "—")} />
          <Row k="Retained memories" v={String(integration?.counts.memories ?? "—")} />
          <Row k="Seeded" v={integration?.seeded ? "yes" : "no"} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Seed data loads automatically on first launch. The simulation reset removes only
          artifacts created during simulation rounds.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/5 p-5">
        <SectionLabel>Scope &amp; safety</SectionLabel>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          FieldMemory is a prototype maintenance assistant. It is not certified for industrial
          deployment. Recommendations are decision support for a qualified technician — always
          verify against current measurements and your plant&apos;s procedures before acting.
        </p>
      </section>
    </div>
  );
}

function StatusRow({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
      )}
      <p className={cn("text-sm", ok ? "text-foreground" : "text-muted-foreground")}>
        {ok ? okText : badText}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
