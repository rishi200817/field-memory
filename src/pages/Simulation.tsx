import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionLabel, OutcomeBadge } from "@/components/common";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  CircleCheck,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

type DiagnoseResult = FunctionReturnType<typeof api.diagnose.diagnose>;

const SCENARIO = {
  machineCode: "C-17",
  fault: "High vibration / High temperature",
  errorCode: "E204",
  severity: "critical" as const,
  temperature: 94,
  vibration: 8.4,
  pressure: 6.1,
};

type Stage = "idle" | "ran_without" | "ran_with" | "resolved" | "recalled_again";

export default function Simulation() {
  const state = useQuery(api.simulation.getSimulationState, {});
  const c17 = useQuery(api.machines.getMachineByCode, { code: "C-17" });

  const diagnoseAction = useAction(api.diagnose.diagnose);
  const setStage = useMutation(api.simulation.setSimulationStage);
  const reset = useMutation(api.simulation.resetSimulation);
  const bumpRound = useMutation(api.simulation.bumpRound);

  const [stage, setStageLocal] = useState<Stage>("idle");
  const [running, setRunning] = useState(false);
  const [without, setWithout] = useState<DiagnoseResult | null>(null);
  const [withMemory, setWithMemory] = useState<DiagnoseResult | null>(null);
  const [recallAgain, setRecallAgain] = useState<DiagnoseResult | null>(null);

  // Sync from server state (survives refresh)
  useEffect(() => {
    if (state && state.stage) {
      setStageLocal(state.stage as Stage);
    }
  }, [state?.stage]);

  async function handleReset() {
    setRunning(true);
    try {
      await reset({});
      setWithout(null);
      setWithMemory(null);
      setRecallAgain(null);
      await setStage({ stage: "idle", lastDiagnosis: undefined });
      setStageLocal("idle");
      toast.success("Scenario reset — the simulation can run again from the start");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setRunning(false);
    }
  }

  async function run(memory: boolean) {
    setRunning(true);
    try {
      await bumpRound({});
      const res = await diagnoseAction({
        machineCode: SCENARIO.machineCode,
        fault: SCENARIO.fault,
        errorCode: SCENARIO.errorCode,
        severity: SCENARIO.severity,
        temperature: SCENARIO.temperature,
        vibration: SCENARIO.vibration,
        pressure: SCENARIO.pressure,
        memoryOn: memory,
        persist: false,
      });
      if (!memory) {
        setWithout(res);
        await setStage({ stage: "ran_without" });
        setStageLocal("ran_without");
      } else {
        setWithMemory(res);
        await setStage({ stage: "ran_with" });
        setStageLocal("ran_with");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Diagnosis failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleRecallAgain() {
    setRunning(true);
    try {
      await bumpRound({});
      const res = await diagnoseAction({
        machineCode: SCENARIO.machineCode,
        fault: SCENARIO.fault,
        errorCode: SCENARIO.errorCode,
        severity: SCENARIO.severity,
        temperature: SCENARIO.temperature,
        vibration: SCENARIO.vibration,
        pressure: SCENARIO.pressure,
        memoryOn: true,
        persist: false,
      });
      setRecallAgain(res);
      await setStage({ stage: "recalled_again" });
      setStageLocal("recalled_again");
      toast.success("Recall complete — the newly retained experience is now in the results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recall failed");
    } finally {
      setRunning(false);
    }
  }

  const openIncident = c17?.incidents.find((i) => i.status === "open");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Memory Learning Simulation"
        subtitle="The complete demo loop on Compressor C-17 / E204 — repeatable, resettable, end-to-end."
        actions={
          <Button variant="outline" onClick={handleReset} disabled={running}>
            <RotateCcw className="size-4" />
            RESET SCENARIO
          </Button>
        }
      />

      {/* Scenario */}
      <section className="rounded-lg border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>Scenario</SectionLabel>
            <h2 className="mt-1 font-display text-lg font-bold">
              Compressor C-17 — E204 recurrence
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2 font-mono text-xs">
            <Metric label="TEMP" value="94°C" tone="text-red-400" />
            <Metric label="VIB" value="8.4 mm/s" tone="text-red-400" />
            <Metric label="PRESS" value="6.1 bar" tone="text-foreground" />
            <Metric label="CODE" value="E204" tone="text-red-400" />
          </div>
        </div>
        {openIncident && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Live incident: {openIncident.code} · status {openIncident.status.toUpperCase()}
            {openIncident.outcome ? ` · outcome ${openIncident.outcome.toUpperCase()}` : ""}
          </p>
        )}
      </section>

      {/* Step controls */}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StepCard
          n={1}
          title="RUN WITHOUT MEMORY"
          desc="The agent sees only the current telemetry."
          done={!!without}
        >
          <Button onClick={() => run(false)} disabled={running} className="w-full" variant="outline">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run without memory
          </Button>
        </StepCard>

        <StepCard
          n={2}
          title="RUN WITH MEMORY"
          desc="Hindsight recall feeds prior C-17 experiences into the diagnosis."
          done={!!withMemory}
        >
          <Button
            onClick={() => run(true)}
            disabled={running}
            className="w-full bg-signal text-signal-foreground hover:bg-signal/90"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
            Run with memory
          </Button>
        </StepCard>

        <StepCard
          n={3}
          title="RECORD RESOLUTION"
          desc="Record the repair in Diagnostics — the experience is retained in Hindsight."
          done={stage === "resolved" || stage === "recalled_again" || (openIncident?.outcome === "resolved")}
        >
          <Button asChild variant="outline" className="w-full" disabled={!openIncident}>
            <Link to={`/diagnostics?incident=${openIncident?._id ?? ""}`}>
              <Waves className="size-4" />
              Open record repair
            </Link>
          </Button>
        </StepCard>

        <StepCard
          n={4}
          title="RECALL AGAIN"
          desc="Run memory-on recall — the new experience now influences the ranking."
          done={!!recallAgain}
        >
          <Button onClick={handleRecallAgain} disabled={running} className="w-full" variant="outline">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Recall again
          </Button>
        </StepCard>
      </div>

      {/* Results comparison */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {without && (
          <ResultPanel
            title="WITHOUT MEMORY — general diagnosis"
            result={without}
            tone="muted"
          />
        )}
        {withMemory && (
          <ResultPanel
            title="WITH MEMORY — experience-aware diagnosis"
            result={withMemory}
            tone="signal"
          />
        )}
      </div>

      {/* Recall again result */}
      {recallAgain && (
        <section className="mt-4 rounded-lg border border-signal/40 bg-signal/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>RECALL AGAIN — experiences ranked for the same fault</SectionLabel>
            <span className="font-mono text-xs text-signal">
              {recallAgain.recall.count} experiences recalled
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {recallAgain.experienceDiagnosis ?? recallAgain.generalDiagnosis}
          </p>
          <div className="mt-3 space-y-2">
            {recallAgain.recall.experiences.map((e, i) => (
              <div
                key={e.memoryId + i}
                className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.action}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {e.machine} / {e.errorCode} · {e.timestamp.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <OutcomeBadge outcome={e.outcome as "resolved" | "failed" | "partial"} />
                  <span className="font-mono text-xs text-signal">{Math.round(e.relevance)}%</span>
                </div>
              </div>
            ))}
          </div>
          {recallAgain.recall.experiences.some((e) => e.outcome === "resolved" && e.action.toLowerCase().includes("alignment")) && (
            <p className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-300">
              The newly retained “Alignment inspected and corrected” experience is now part of the
              recall set and changes the recommendation ordering.
            </p>
          )}
        </section>
      )}

      {/* Guidance footer */}
      <p className="mt-4 text-xs text-muted-foreground">
        The simulation uses the same diagnose pipeline as the live product. Reset removes only
        artifacts created during simulation rounds — seeded plant history is never modified.
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-border bg-background/50 px-2 py-1 text-center">
      <p className="text-[9px] tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-semibold", tone)}>{value}</p>
    </div>
  );
}

function StepCard({
  n,
  title,
  desc,
  done,
  children,
}: {
  n: number;
  title: string;
  desc: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card/60 p-4",
        done ? "border-emerald-400/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">STEP {n}</span>
        {done && <CircleCheck className="size-4 text-emerald-400" />}
      </div>
      <p className="mt-1 font-mono text-xs font-bold tracking-wide">{title}</p>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ResultPanel({
  title,
  result,
  tone,
}: {
  title: string;
  result: DiagnoseResult;
  tone: "muted" | "signal";
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-5",
        tone === "signal" ? "border-signal/40 bg-signal/5" : "border-border bg-card/60",
      )}
    >
      <SectionLabel>{title}</SectionLabel>
      <p className="mt-3 text-sm leading-relaxed">
        {tone === "signal"
          ? result.experienceDiagnosis ?? result.generalDiagnosis
          : result.generalDiagnosis}
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
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        {result.usedLLM ? "LLM generation" : "Rules-based fallback"} ·{" "}
        {result.recall.count} experiences recalled
      </p>
    </section>
  );
}
