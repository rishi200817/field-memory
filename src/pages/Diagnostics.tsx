import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionLabel, OutcomeBadge, SeverityBadge } from "@/components/common";
import { fmtDate, fmtDateTime, telemetryTone } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  CircleCheck,
  Loader2,
  Radar,
  RotateCcw,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

type DiagnoseResult = FunctionReturnType<typeof api.diagnose.diagnose>;
type Recalled = DiagnoseResult["recall"]["experiences"][number];

type RunState = {
  running: boolean;
  result?: DiagnoseResult;
  error?: string;
};

export default function Diagnostics() {
  const [params] = useSearchParams();
  const incidentId = params.get("incident");

  const incidentData = useQuery(
    api.incidents.getIncident,
    incidentId ? { id: incidentId as any } : "skip"
  );
  const incidents = useQuery(api.incidents.listIncidents, {});

  // Incidents without a recorded outcome yet (open, or failed/partial so a new
  // attempt can be recorded).
  const open = useMemo(
    () => incidents?.filter((i) => i.status === "open") ?? [],
    [incidents],
  );

  const selected = useMemo(() => {
    if (incidentData?.incident) {
      const m = incidentData.machine;
      return {
        ...incidentData.incident,
        machine: m ? { _id: m._id, name: m.name, code: m.code } : null,
      };
    }
    return open[0] ?? null;
  }, [incidentData, open]);

  const [memoryOn, setMemoryOn] = useState(false);
  const [run, setRun] = useState<RunState>({ running: false });
  const [compare, setCompare] = useState<{ without?: DiagnoseResult; with?: DiagnoseResult }>({});

  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<"resolved" | "failed" | "partial">("resolved");
  const [retain, setRetain] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ memoryCode: string; memoryId: string } | null>(null);

  // ---- diagnosis run ------------------------------------------------------
  const diagnoseAction = useAction(api.diagnose.diagnose);
  const canRun = Boolean(selected) && !run.running;

  async function runDiagnosis(memory: boolean) {
    if (!selected) return;
    setRun({ running: true });
    try {
      const res = await diagnoseAction({
        incidentId: selected._id,
        machineCode: selected.machine?.code ?? "",
        fault: selected.fault,
        errorCode: selected.errorCode,
        severity: selected.severity,
        temperature: selected.telemetry.temperature,
        vibration: selected.telemetry.vibration,
        pressure: selected.telemetry.pressure,
        memoryOn: memory,
        persist: true,
      });
      setRun({ running: false, result: res });
      setCompare((c) => (memory ? { ...c, with: res } : { ...c, without: res }));
      toast.success(memory ? "Diagnosis complete — memory ON" : "Diagnosis complete — memory OFF");
    } catch (err) {
      setRun({
        running: false,
        error: err instanceof Error ? err.message : "Diagnosis failed — try again.",
      });
      toast.error("Diagnosis failed. The rules-based fallback was used where possible.");
    }
  }

  async function runBoth() {
    if (!selected) return;
    setRun({ running: true });
    try {
      const without = await diagnoseAction({
        incidentId: selected._id,
        machineCode: selected.machine?.code ?? "",
        fault: selected.fault,
        errorCode: selected.errorCode,
        severity: selected.severity,
        temperature: selected.telemetry.temperature,
        vibration: selected.telemetry.vibration,
        pressure: selected.telemetry.pressure,
        memoryOn: false,
        persist: true,
      });
      const withMemory = await diagnoseAction({
        incidentId: selected._id,
        machineCode: selected.machine?.code ?? "",
        fault: selected.fault,
        errorCode: selected.errorCode,
        severity: selected.severity,
        temperature: selected.telemetry.temperature,
        vibration: selected.telemetry.vibration,
        pressure: selected.telemetry.pressure,
        memoryOn: true,
        persist: true,
      });
      setCompare({ without, with: withMemory });
      setRun({ running: false, result: withMemory });
      toast.success("Both runs complete — compare the two diagnoses");
    } catch (err) {
      setRun({ running: false, error: err instanceof Error ? err.message : "Run failed" });
      toast.error("Diagnosis failed");
    }
  }

  // ---- record repair ------------------------------------------------------
  const resolveMutation = useMutation(api.incidents.resolveIncident);
  const retainAction = useAction(api.retain.retainToHindsight);

  async function handleResolve() {
    if (!selected) return;
    if (!action.trim()) {
      toast.error("Describe the action taken before recording the repair.");
      return;
    }
    setSaving(true);
    try {
      const res = await resolveMutation({
        incidentId: selected._id,
        action: action.trim(),
        technicianNotes: notes.trim(),
        result,
        retain,
      });
      let memoryCode = res.memoryCode;
      if (retain) {
        const machine = incidentData?.machine;
        await retainAction({
          memoryId: res.memoryId,
          machine: machine?.code ?? "",
          fault: selected.fault,
          errorCode: selected.errorCode,
          symptoms: [
            `Temperature ${selected.telemetry.temperature}°C`,
            `Vibration ${selected.telemetry.vibration} mm/s`,
            `Pressure ${selected.telemetry.pressure} bar`,
          ],
          diagnosis: run.result?.experienceDiagnosis ?? run.result?.generalDiagnosis ?? "On-site diagnosis",
          action: action.trim(),
          outcome: result,
          technician: "Maintenance Team",
          technicianNotes: notes.trim(),
          learning:
            result === "resolved"
              ? `${action.trim()} resolved ${selected.errorCode} — retain as preferred first check.`
              : result === "failed"
                ? `${action.trim()} did not clear ${selected.errorCode} — do not repeat without root-cause fix.`
                : `${action.trim()} partially improved ${selected.errorCode} — residual symptoms remain.`,
          severity: selected.severity,
          timestamp: new Date().toISOString(),
        });
      }
      setSavedInfo({ memoryCode, memoryId: res.memoryId });
      toast.success("Experience retained in Hindsight", {
        description: `${memoryCode} · ${result.toUpperCase()}`,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not record the repair — try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // Reset repair form when incident changes
  useEffect(() => {
    setAction("");
    setNotes("");
    setResult("resolved");
    setSavedInfo(null);
    setRun({ running: false });
    setCompare({});
  }, [incidentId, selected?._id]);

  if (incidents !== undefined && incidents.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">No incidents available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Seed data may not have loaded. Refresh the page to retry.
        </p>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Diagnostics" subtitle="Select an incident to diagnose." />
        {incidents === undefined ? (
          <div className="h-64 animate-pulse rounded-lg border border-border bg-card/40" />
        ) : (
          <div className="rounded-lg border border-border bg-card/60 p-10 text-center">
            <p className="text-sm font-medium">Every incident has an outcome recorded</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reopen the demo by running the Simulation, or pick a closed incident to review.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="outline">
                <Link to="/simulation">Open Simulation</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/incidents">View incidents</Link>
              </Button>
            </div>
          </div>
        )}
        {incidents && incidents.length > 0 && (
          <div className="mt-6">
            <SectionLabel>Review a closed incident</SectionLabel>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {incidents.slice(0, 6).map((i) => (
                <Link
                  key={i._id}
                  to={`/diagnostics?incident=${i._id}`}
                  className="flex items-center justify-between rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm hover:border-signal/40"
                >
                  <span className="font-mono text-xs">{i.code} · {i.fault}</span>
                  <OutcomeBadge outcome={i.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const telemetry = selected.telemetry;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 font-mono text-xs text-muted-foreground">
        <Link to="/overview" className="hover:text-foreground">Overview</Link>
        <span className="mx-2">/</span>
        <Link to="/incidents" className="hover:text-foreground">Incidents</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{selected.code}</span>
      </div>

      <PageHeader
        title={`AI Diagnosis — ${selected.machine?.name ?? selected.code}`}
        subtitle="Diagnose with current signals. Decide with historical experience."
        actions={
          <Select
            value={selected._id}
            onValueChange={(v) => {
              setRun({ running: false });
              setCompare({});
              window.history.replaceState(null, "", `/diagnostics?incident=${v}`);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {incidents?.map((i) => (
                <SelectItem key={i._id} value={i._id}>
                  <span className="font-mono text-xs">{i.code}</span>
                  <span className="ml-2 text-muted-foreground">{i.machine?.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {/* LEFT: current incident */}
        <section className="rounded-lg border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Current incident</SectionLabel>
            <SeverityBadge severity={selected.severity} />
          </div>
          <h2 className="mt-2 font-display text-lg font-bold">{selected.machine?.name}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {selected.code} · {selected.fault}
          </p>

          <div className="mt-4 space-y-2.5">
            <TelemetryRow
              label="Temperature"
              value={`${telemetry.temperature}°C`}
              tone={telemetryTone(telemetry.temperature, 80, 90)}
            />
            <TelemetryRow
              label="Vibration"
              value={`${telemetry.vibration} mm/s`}
              tone={telemetryTone(telemetry.vibration, 6, 7.5)}
            />
            <TelemetryRow
              label="Pressure"
              value={`${telemetry.pressure} bar`}
              tone="text-foreground"
            />
            <TelemetryRow label="Error" value={selected.errorCode} tone="text-red-400" />
          </div>

          <div className="mt-4 border-t border-border/60 pt-3 font-mono text-[11px] text-muted-foreground">
            <p>Reported {fmtDateTime(selected.date)}</p>
            <p className="mt-0.5">
              Machine: {selected.machine?.code} · Plant A · Unit 3
            </p>
          </div>
        </section>

        {/* CENTER: AI diagnosis */}
        <section className="rounded-lg border border-border bg-card/60 p-5 xl:col-span-1">
          <div className="flex items-center justify-between">
            <SectionLabel>AI diagnosis</SectionLabel>
            <MemorySwitch memoryOn={memoryOn} setMemoryOn={setMemoryOn} />
          </div>

          {/* Run buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => runDiagnosis(memoryOn)}
              disabled={!canRun}
              className="flex-1 bg-signal text-signal-foreground hover:bg-signal/90"
            >
              {run.running ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Waves className="size-4" />
                  RUN DIAGNOSIS ({memoryOn ? "MEMORY ON" : "MEMORY OFF"})
                </>
              )}
            </Button>
            <Button variant="outline" onClick={runBoth} disabled={!canRun}>
              <RotateCcw className="size-4" />
              RUN BOTH
            </Button>
          </div>

          {/* Recall sequence */}
          {run.running && (
            <RecallSequence memoryOn={memoryOn} />
          )}

          {run.error && (
            <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-300">
              {run.error}
              <button
                className="ml-2 underline hover:text-red-200"
                onClick={() => runDiagnosis(memoryOn)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Diagnosis output */}
          {!run.running && run.result && (
            <div className="mt-3 space-y-3">
              {memoryOn || compare.with ? (
                <DiagnosisCard result={compare.with ?? run.result} memoryOn />
              ) : (
                <DiagnosisCard result={run.result} memoryOn={false} />
              )}
            </div>
          )}

          {/* Empty state before first run */}
          {!run.running && !run.result && (
            <div className="mt-3 rounded-md border border-dashed border-border bg-background/40 p-6 text-center">
              <Radar className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No diagnosis run yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run with MEMORY OFF for the generic view, then with MEMORY ON to recall retained
                experiences.
              </p>
            </div>
          )}

          {/* WHY THIS RECOMMENDATION */}
          {compare.with && compare.with.recall.count > 0 && (
            <WhyRecommendation
              withoutCount={compare.without?.recall.count ?? 0}
              withResult={compare.with}
            />
          )}
        </section>

        {/* RIGHT: recalled experiences */}
        <section className="rounded-lg border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Recalled experiences</SectionLabel>
            {run.result?.recall && run.result.recall.count > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-signal">
                {run.result.recall.count} relevant
              </span>
            )}
          </div>

          {memoryOn ? (
            run.result?.recall && run.result.recall.count > 0 ? (
              <div className="mt-3 space-y-3">
                {run.result.recall.experiences.map((e, idx) => (
                  <MemoryCard key={e.memoryId + idx} e={e} rank={idx + 1} />
                ))}
                <p className="pt-1 font-mono text-[10px] text-muted-foreground">
                  Source: {run.result.recall.provider === "hindsight" ? "Hindsight provider" : "local memory adapter"}
                  {run.result.recall.error ? ` · ${run.result.recall.error}` : ""}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-border bg-background/40 p-6 text-center">
                <p className="text-sm font-medium">No recall performed yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run the diagnosis with MEMORY ON to search retained experiences.
                </p>
              </div>
            )
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-border bg-background/40 p-6 text-center">
              <BrainCircuit className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Memory is OFF</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The agent sees only the current incident. Historical experience is excluded from
                the diagnosis.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* RECORD REPAIR */}
      <section className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <SectionLabel>Record repair &amp; retain experience</SectionLabel>
            <p className="mt-1 text-xs text-muted-foreground">
              Record the actual repair — the outcome is retained as a new experience and becomes
              available to future diagnoses.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={retain}
              onChange={(e) => setRetain(e.target.checked)}
              className="size-3.5 accent-[oklch(0.72_0.14_210)]"
            />
            Retain this experience
          </label>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <div>
            <label className="mb-1.5 block text-xs font-medium">Action taken</label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Alignment inspected and corrected"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Technician notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Found shaft misalignment of 0.18 mm. Corrected and recalibrated."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Result</label>
            <Select value={result} onValueChange={(v: typeof result) => setResult(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="partial">Partially resolved</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleResolve}
            disabled={saving}
            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Recording…
              </>
            ) : (
              <>
                <CircleCheck className="size-4" />
                RESOLVE &amp; REMEMBER
              </>
            )}
          </Button>
          {savedInfo && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5">
              <CircleCheck className="size-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                Experience retained in Hindsight
              </span>
              <Link
                to={`/memory/${savedInfo.memoryId}`}
                className="font-mono text-[10px] text-emerald-300 underline"
              >
                {savedInfo.memoryCode}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ---- pieces -----------------------------------------------------------------

function TelemetryRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  );
}

function MemorySwitch({
  memoryOn,
  setMemoryOn,
}: {
  memoryOn: boolean;
  setMemoryOn: (v: boolean) => void;
}) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      <button
        onClick={() => setMemoryOn(false)}
        className={cn(
          "rounded px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider transition-colors",
          !memoryOn ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        MEMORY OFF
      </button>
      <button
        onClick={() => setMemoryOn(true)}
        className={cn(
          "rounded px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider transition-colors",
          memoryOn ? "bg-signal text-signal-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        MEMORY ON
      </button>
    </div>
  );
}

function RecallSequence({ memoryOn }: { memoryOn: boolean }) {
  const steps = memoryOn
    ? ["RECALLING EXPERIENCE", "SEARCHING MEMORY", "3 RELEVANT MEMORIES FOUND", "ANALYZING HISTORY", "RECOMMENDATION UPDATED"]
    : ["READING TELEMETRY", "ANALYZING CURRENT SIGNALS", "GENERATING GENERAL DIAGNOSIS"];
  return (
    <div className="mt-3 space-y-1.5 rounded-md border border-signal/25 bg-signal/5 p-3">
      {steps.map((s, i) => (
        <div
          key={s}
          className="flex items-center gap-2 font-mono text-[11px] text-signal"
          style={{ animation: `fade-slide 0.4s ease ${i * 0.25}s both` }}
        >
          <Loader2 className="size-3 animate-spin" />
          {s}
        </div>
      ))}
      <style>{`@keyframes fade-slide { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

function DiagnosisCard({ result, memoryOn }: { result: DiagnoseResult; memoryOn: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        memoryOn ? "border-signal/40 bg-signal/5" : "border-border bg-background/40",
      )}
    >
      <div className="flex items-center justify-between">
        <SectionLabel>{memoryOn ? "Experience-aware diagnosis" : "General diagnosis"}</SectionLabel>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider",
            memoryOn ? "bg-signal text-signal-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {memoryOn ? "MEMORY ON" : "NO HISTORICAL CONTEXT USED"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {memoryOn ? result.experienceDiagnosis ?? result.generalDiagnosis : result.generalDiagnosis}
      </p>

      <div className="mt-3 border-t border-border/60 pt-3">
        <SectionLabel>Recommended next steps</SectionLabel>
        <ol className="mt-1.5 space-y-1">
          {result.recommendedSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {memoryOn && result.recalledSummary && (
        <p className="mt-3 border-t border-border/60 pt-3 font-mono text-[11px] text-signal">
          {result.recalledSummary}
        </p>
      )}
      <p className="mt-2 text-xs italic text-muted-foreground">{result.caveat}</p>
      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        {result.usedLLM ? "LLM generation ·" : "Rules-based fallback ·"}
        {memoryOn ? " grounded in retained history" : " current signals only"}
      </p>
    </div>
  );
}

function MemoryCard({ e, rank }: { e: Recalled; rank: number }) {
  const outcomeTone =
    e.outcome === "failed"
      ? "text-red-400 border-red-400/30 bg-red-400/10"
      : e.outcome === "resolved"
        ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
        : "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return (
    <Link
      to={`/memory/${e.memoryId}`}
      className="block rounded-md border border-signal/25 bg-background/40 p-3 transition-colors hover:border-signal/50"
      style={{ animation: `fade-slide 0.35s ease ${rank * 0.12}s both` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(e.timestamp)}</span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider",
            outcomeTone,
          )}
        >
          {e.outcome.toUpperCase()}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium">{e.action}</p>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
        {e.machine} / {e.errorCode}
      </p>
      <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
        “{e.technicianNotes}”
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-signal">relevance {e.relevance}%</span>
        <span className="font-mono text-[10px] text-muted-foreground">#{rank} match</span>
      </div>
    </Link>
  );
}

function WhyRecommendation({
  withoutCount,
  withResult,
}: {
  withoutCount: number;
  withResult: DiagnoseResult;
}) {
  const failed = withResult.recall.experiences.filter((e) => e.outcome === "failed").length;
  const succeeded = withResult.recall.experiences.filter((e) => e.outcome === "resolved").length;
  return (
    <div className="mt-4 rounded-md border border-signal/30 bg-signal/5 p-4">
      <SectionLabel>Why this recommendation?</SectionLabel>
      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <Chip label="Current signal" value={withResult.recall.count > 0 ? "1 incident" : "1 incident"} />
        <Plus />
        <Chip label="Recalled experiences" value={`${withResult.recall.count} found`} tone="signal" />
        <Plus />
        <Chip label="Failed attempts" value={`${failed} recalled`} tone="red" />
        <Plus />
        <Chip label="Successful repairs" value={`${succeeded} recalled`} tone="green" />
        <span className="px-1 text-muted-foreground">=</span>
        <Chip
          label="Recommendation"
          value="history-aware next step"
          tone="signal"
          strong
        />
      </div>
      <p className="mt-3 text-sm text-foreground">
        Recommendation changed because historical evidence was available — without memory the
        agent would have produced the generic view ({withoutCount || "0"} experiences searched).
      </p>
    </div>
  );
}

function Chip({
  label,
  value,
  tone = "default",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "signal" | "red" | "green";
  strong?: boolean;
}) {
  const tones = {
    default: "border-border bg-background/60 text-foreground",
    signal: "border-signal/40 bg-signal/10 text-signal",
    red: "border-red-400/40 bg-red-400/10 text-red-300",
    green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  } as const;
  return (
    <span
      className={cn(
        "rounded border px-2 py-1",
        tones[tone],
        strong && "border-signal bg-signal text-signal-foreground font-semibold",
      )}
    >
      {label}: <span className="font-semibold">{value}</span>
    </span>
  );
}

function Plus() {
  return <span className="text-muted-foreground">+</span>;
}
