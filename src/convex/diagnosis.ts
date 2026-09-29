// Shared domain logic for the AI diagnosis engine (used by Convex actions).
// Keeps the memory-on / memory-off behavior in one place so results are
// consistent between the Diagnostics page, machine pages, and Simulation.

import type { RecalledExperience } from "./hindsight";

export type DiagnosisResult = {
  generalDiagnosis: string;
  recommendedSteps: string[];
  recalledSummary?: string;
  experienceDiagnosis?: string;
  caveat: string;
};

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

export type LLMClient = {
  complete(prompt: string): Promise<string>;
};

/** Build the memory-off (general) prompt from current telemetry only. */
export function buildGeneralPrompt(ctx: {
  machine: string;
  fault: string;
  errorCode: string;
  severity: string;
  temperature: number;
  vibration: number;
  pressure: number;
}): string {
  return `CURRENT INCIDENT (no historical context available)
Machine: ${ctx.machine}
Fault: ${ctx.fault}
Error code: ${ctx.errorCode}
Severity: ${ctx.severity}
Telemetry: temperature ${ctx.temperature}°C, vibration ${ctx.vibration} mm/s, pressure ${ctx.pressure} bar

Produce:
1. A short general diagnosis of likely causes from these signals only.
2. 3 recommended next steps, each one line.
Format exactly:
DIAGNOSIS: <text>
STEPS: <step 1> | <step 2> | <step 3>`;
}

/** Build the memory-on prompt: current incident + recalled experiences. */
export function buildExperiencePrompt(
  ctx: Parameters<typeof buildGeneralPrompt>[0],
  experiences: RecalledExperience[],
): string {
  const history = experiences
    .map(
      (e) =>
        `- ${e.timestamp.slice(0, 10)} | ${e.machine} | ${e.fault} (${e.errorCode}) | action: ${e.action} | outcome: ${e.outcome.toUpperCase()} | notes: ${e.technicianNotes}`,
    )
    .join("\n");
  return `CURRENT INCIDENT
Machine: ${ctx.machine}
Fault: ${ctx.fault}
Error code: ${ctx.errorCode}
Severity: ${ctx.severity}
Telemetry: temperature ${ctx.temperature}°C, vibration ${ctx.vibration} mm/s, pressure ${ctx.pressure} bar

HISTORICAL EXPERIENCES RETAINED FROM THIS MACHINE
${history}

Produce:
1. A diagnosis that explicitly uses the history above (name the failed attempt and the successful one if present).
2. 3 recommended next steps in priority order, respecting what failed before.
3. One caveat about uncertainty.
Format exactly:
DIAGNOSIS: <text>
STEPS: <step 1> | <step 2> | <step 3>
CAVEAT: <text>`;
}

/** Deterministic rules-based fallback used when the LLM is unavailable. */
export function generalDiagnosisRules(ctx: {
  machine: string;
  fault: string;
  errorCode: string;
  temperature: number;
  vibration: number;
  pressure: number;
}): DiagnosisResult {
  return {
    generalDiagnosis:
      "Possible causes include bearing wear, lubrication problems, or shaft misalignment. Inspect the bearing, lubrication system, and shaft alignment.",
    recommendedSteps: [
      "Inspect bearing condition",
      "Check lubrication levels and pressure",
      "Verify shaft alignment",
    ],
    caveat:
      "Current signals only. Without machine history, recurring or previously failed repairs cannot be ruled out.",
  };
}

/** Deterministic fallback that genuinely uses recalled history. */
export function experienceDiagnosisRules(
  ctx: { machine: string; fault: string; errorCode: string },
  experiences: RecalledExperience[],
): DiagnosisResult {
  const failed = experiences.filter((e) => e.outcome === "failed");
  const succeeded = experiences.filter((e) => e.outcome === "resolved");
  const top = experiences[0];

  let diagnosis: string;
  if (failed.length && succeeded.length) {
    diagnosis = `I found previous incidents involving ${ctx.machine}. A ${failed[0].action.toLowerCase()} was previously attempted for ${ctx.errorCode} and did not resolve the issue. ${succeeded[0].action.charAt(0).toUpperCase()}${succeeded[0].action.slice(1).toLowerCase()} succeeded in a later incident. Check alignment before repeating the failed bearing replacement.`;
  } else if (failed.length) {
    diagnosis = `I found previous incidents involving ${ctx.machine}. A ${failed[0].action.toLowerCase()} was attempted on ${failed[0].timestamp.slice(0, 10)} and failed to clear ${ctx.errorCode} — the notes suggest the root cause sits upstream of that component. Treat a repeat of the same repair as low confidence.`;
  } else if (succeeded.length) {
    diagnosis = `I found previous incidents involving ${ctx.machine}. ${succeeded[0].action.charAt(0).toUpperCase()}${succeeded[0].action.slice(1).toLowerCase()} resolved ${ctx.errorCode} previously on ${succeeded[0].timestamp.slice(0, 10)}. Historical evidence suggests starting there before broader teardown.`;
  } else {
    diagnosis = `No close historical match found; treating this as a first-of-kind fault on ${ctx.machine}.`;
  }

  const steps: string[] = [];
  if (succeeded.length) steps.push(`Inspect shaft alignment first (succeeded on ${succeeded[0].timestamp.slice(0, 10)})`);
  if (top) steps.push("Check lubrication pressure and filter differential");
  if (failed.length) steps.push(`Avoid repeating ${failed[0].action.toLowerCase()} until the above are cleared`);
  while (steps.length < 3) steps.push("Monitor vibration trend and record findings for the next diagnosis");
  const stepsFinal = steps.slice(0, 3);

  const failedCount = failed.length + experiences.filter((e) => e.outcome === "partial").length;
  const caveat =
    experiences.length > 0
      ? `${experiences.length} relevant experiences were recalled (${failedCount} ended in failure or partial repair). Historical evidence suggests the sequence above; verify with current measurements before acting.`
      : "Historical evidence suggests limited value here — this fault has no close precedent in memory.";

  return {
    generalDiagnosis:
      "Possible causes include bearing wear, lubrication problems, or shaft misalignment. Inspect the bearing, lubrication system, and shaft alignment.",
    recommendedSteps: stepsFinal,
    recalledSummary: `${experiences.length} relevant experiences were recalled for ${ctx.machine} / ${ctx.errorCode}.`,
    experienceDiagnosis: diagnosis,
    caveat,
  };
}

/** Parse LLM output in the DIAGNOSIS/STEPS/CAVEAT format, with sane fallbacks. */
export function parseLLMDiagnosis(text: string, base: DiagnosisResult): DiagnosisResult {
  const diagnosisMatch = text.match(/DIAGNOSIS:\s*([\s\S]*?)(?:\nSTEPS:|$)/i);
  const stepsMatch = text.match(/STEPS:\s*([\s\S]*?)(?:\nCAVEAT:|$)/i);
  const caveatMatch = text.match(/CAVEAT:\s*([\s\S]*)/i);
  const steps = stepsMatch?.[1]
    ?.split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    ...base,
    generalDiagnosis: diagnosisMatch?.[1]?.trim() || base.generalDiagnosis,
    recommendedSteps: steps && steps.length ? steps : base.recommendedSteps,
    caveat: caveatMatch?.[1]?.trim() || base.caveat,
  };
}
