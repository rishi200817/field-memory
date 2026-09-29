import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { vly } from "../lib/vly-integrations";
import { hindsightConfigured, rankExperiences, type RecalledExperience } from "./hindsight";
import {
  buildExperiencePrompt,
  buildGeneralPrompt,
  experienceDiagnosisRules,
  generalDiagnosisRules,
  parseLLMDiagnosis,
} from "./diagnosis";
import { seedMachines, seedIncidents, seedMemories } from "./seedData";

const SYSTEM_PROMPT = `You are FieldMemory's maintenance diagnosis assistant for an industrial plant.
You receive the current incident telemetry and, optionally, prior experiences retained from this machine's history.
Rules:
- Write like a senior maintenance engineer: concrete, calm, specific.
- If prior experiences are provided, reference them explicitly (e.g. "a bearing replacement was attempted on 19 Sep 2026 and failed to clear the fault").
- Distinguish historical evidence from current telemetry; never claim certainty.
- Use phrases like "historical evidence suggests", "recommended next check", "likely cause".
- Never use words like "revolutionary", "seamless", "AI-powered", "game-changing", "unlock".
- The recommendation must respect history: if a repair failed before, say so and advise checking other likely causes first.
Keep the diagnosis under 90 words.`;

// ---------------------------------------------------------------------------
// Diagnose: the core product action.
// ---------------------------------------------------------------------------

export const diagnose = action({
  args: {
    incidentId: v.optional(v.id("incidents")),
    machineCode: v.string(),
    fault: v.string(),
    errorCode: v.string(),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    temperature: v.number(),
    vibration: v.number(),
    pressure: v.number(),
    memoryOn: v.boolean(),
    persist: v.boolean(),
  },
  handler: async (ctx, args): Promise<{
    diagnosisId?: string;
    memoryOn: boolean;
    usedLLM: boolean;
    recall: {
      provider: "hindsight" | "local";
      error?: string;
      count: number;
      experiences: RecalledExperience[];
    };
    generalDiagnosis: string;
    recommendedSteps: string[];
    experienceDiagnosis?: string;
    recalledSummary?: string;
    caveat: string;
  }> => {
    const nowIso = new Date().toISOString();
    const current = {
      machine: args.machineCode,
      fault: args.fault,
      errorCode: args.errorCode,
      timestamp: nowIso,
    };

    // ---- 1. RECALL (only when memory is ON) -------------------------------
    let experiences: RecalledExperience[] = [];
    let recallProvider: "hindsight" | "local" = "local";
    let recallError: string | undefined;

    if (args.memoryOn) {
      // Local provider candidates: all stored memories (seeded + retained)
      const allMemories = await ctx.runQuery(api.memories.listMemories, {});
      const candidates = allMemories.map((m: any) => ({
        memoryId: m._id as string,
        memoryCode: m.code as string,
        machine: (m.machine?.code ?? "") as string,
        fault: m.fault as string,
        errorCode: m.errorCode as string,
        action: m.action as string,
        outcome: m.outcome as string,
        technicianNotes: m.technicianNotes as string,
        timestamp: m.timestamp as string,
      }));
      experiences = rankExperiences(candidates, current, 3);

      // Prefer the Hindsight provider when configured (it re-ranks remotely
      // recalled hits with the same deterministic logic).
      if (hindsightConfigured()) {
        const remote = await recallViaHindsight(current);
        if (remote) {
          if (remote.experiences.length > 0) {
            experiences = remote.experiences;
            recallProvider = "hindsight";
            recallError = remote.error;
          } else {
            recallError = remote.error ?? "Hindsight returned no experiences";
          }
        }
      }
    }

    // ---- 2. GENERATE (LLM with deterministic fallback) --------------------
    const diagCtx: { machine: string; fault: string; errorCode: string; severity: string; temperature: number; vibration: number; pressure: number } = {
      machine: args.machineCode,
      fault: args.fault,
      errorCode: args.errorCode,
      severity: args.severity,
      temperature: args.temperature,
      vibration: args.vibration,
      pressure: args.pressure,
    };

    let usedLLM = false;
    let result;
    try {
      if (args.memoryOn && experiences.length > 0) {
        const prompt = buildExperiencePrompt(diagCtx, experiences);
        const llmText = await completeLLM(prompt);
        usedLLM = true;
        result = parseLLMDiagnosis(llmText, experienceDiagnosisRules(diagCtx, experiences));
      } else {
        const prompt = buildGeneralPrompt(diagCtx);
        const llmText = await completeLLM(prompt);
        usedLLM = true;
        result = parseLLMDiagnosis(llmText, generalDiagnosisRules(diagCtx));
      }
    } catch {
      usedLLM = false;
      result =
        args.memoryOn && experiences.length > 0
          ? experienceDiagnosisRules(diagCtx, experiences)
          : generalDiagnosisRules(diagCtx);
    }

    // ---- 3. PERSIST --------------------------------------------------------
    let diagnosisId: string | undefined;
    if (args.persist && args.incidentId) {
      diagnosisId = await ctx.runMutation(api.diagnoses.insert, {
        incidentId: args.incidentId,
        memoryUsed: args.memoryOn,
        generalDiagnosis: result.generalDiagnosis,
        recommendedSteps: result.recommendedSteps,
        recalledMemoryIds: experiences.map((e) => e.memoryId as any),
        recalledSummary:
          experiences.length > 0
            ? `${experiences.length} relevant experiences were recalled (${recallProvider === "hindsight" ? "Hindsight provider" : "local adapter"}).`
            : "No historical context used.",
        experienceDiagnosis: args.memoryOn
          ? result.experienceDiagnosis ?? result.generalDiagnosis
          : undefined,
        caveat: result.caveat,
        usedLLM,
      });
      if (args.memoryOn && experiences.length > 0) {
        await ctx.runMutation(api.learningEvents.insert, {
          kind: "recall_performed",
          title: `Agent recalled history — ${args.machineCode}`,
          detail: `${experiences.length} relevant experiences recalled from ${recallProvider === "hindsight" ? "Hindsight" : "the local memory adapter"}.`,
          timestamp: new Date(Date.now() + 2).toISOString(),
        });
      }
    }

    return {
      diagnosisId,
      memoryOn: args.memoryOn,
      usedLLM,
      recall: {
        provider: recallProvider,
        error: recallError,
        count: experiences.length,
        experiences,
      },
      generalDiagnosis: result.generalDiagnosis,
      recommendedSteps: result.recommendedSteps,
      experienceDiagnosis: result.experienceDiagnosis,
      recalledSummary: result.recalledSummary,
      caveat: result.caveat,
    };
  },
});

// ---------------------------------------------------------------------------
// LLM completion via the Vly AI integration (server-side key)
// ---------------------------------------------------------------------------

async function completeLLM(prompt: string): Promise<string> {
  const res = await vly.ai.completion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    maxTokens: 500,
  });
  if (!res.success || !res.data) {
    throw new Error(res.error ?? "LLM unavailable");
  }
  const content = res.data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

async function recallViaHindsight(
  current: { machine: string; fault: string; errorCode: string; timestamp: string },
): Promise<{ experiences: RecalledExperience[]; error?: string } | null> {
  if (!hindsightConfigured()) return null;
  try {
    const res = await fetch(
      `${process.env.HINDSIGHT_API_URL!.replace(/\/$/, "")}/recall?q=${encodeURIComponent(
        `${current.machine} ${current.fault} ${current.errorCode}`,
      )}&limit=8`,
      {
        headers: { Authorization: `Bearer ${process.env.HINDSIGHT_API_KEY}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return { experiences: [], error: `Hindsight recall failed (${res.status})` };
    const data = (await res.json().catch(() => [])) as Array<{
      id?: string;
      content?: Record<string, unknown>;
    }>;
    const experiences = rankExperiences(
      data.map((m) => {
        const c = (m.content ?? {}) as Record<string, string>;
        return {
          externalId: m.id,
          machine: String(c.machine ?? ""),
          fault: String(c.fault ?? ""),
          errorCode: String(c.error_code ?? ""),
          action: String(c.action ?? ""),
          outcome: String(c.outcome ?? ""),
          technicianNotes: String(c.technician_notes ?? ""),
          timestamp: String(c.timestamp ?? current.timestamp),
          memoryCode: String(c.memory_code ?? m.id ?? ""),
          memoryId: String(m.id ?? "external"),
        };
      }),
      current,
    );
    return { experiences };
  } catch (err) {
    return {
      experiences: [],
      error: err instanceof Error ? err.message : "Hindsight unreachable",
    };
  }
}
