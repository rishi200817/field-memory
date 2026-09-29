// Hindsight memory provider adapter — server-side only (runs inside Convex).
//
// When HINDSIGHT_API_URL + HINDSIGHT_API_KEY are configured, retain/recall/
// getMemory call the Hindsight HTTP API. Without credentials the exact same
// interface is served by a local adapter backed by the Convex database, so the
// app runs end-to-end in development. API keys never reach the browser.

export type RetainInput = {
  machine: string;
  fault: string;
  errorCode: string;
  symptoms: string[];
  diagnosis: string;
  action: string;
  outcome: "resolved" | "failed" | "partial";
  technician: string;
  technicianNotes: string;
  learning: string;
  severity: string;
  timestamp: string;
};

export type RetainResult = {
  ok: boolean;
  memoryId?: string;
  provider: "hindsight" | "local";
  error?: string;
};

export type RecalledExperience = {
  externalId?: string;
  machine: string;
  fault: string;
  errorCode: string;
  action: string;
  outcome: string;
  technicianNotes: string;
  timestamp: string;
  /** Derived from deterministic ranking logic in recallExperiences() — not invented. */
  relevance: number; // 0–100
  memoryCode: string;
  memoryId: string;
};

export type RecallResult = {
  ok: boolean;
  experiences: RecalledExperience[];
  provider: "hindsight" | "local";
  error?: string;
};

const HINDSIGHT_API_URL = process.env.HINDSIGHT_API_URL;
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY;

export function hindsightConfigured(): boolean {
  return Boolean(HINDSIGHT_API_URL && HINDSIGHT_API_KEY);
}

/**
 * Relevance ranking used by the LOCAL provider (and to re-rank remote hits).
 * Deterministic and explainable:
 *  - same error code      +45
 *  - same fault text       +25 (partial match +15)
 *  - same machine          +15 (cross-machine precedent +4)
 *  - recency               +0–10 (newest full marks)
 *  - outcome weight         +3 (failed/partial carry decision-relevant signal)
 */
export function relevanceScore(
  a: {
    machine: string;
    fault: string;
    errorCode: string;
    timestamp: string;
    outcome: string;
  },
  current: { machine: string; fault: string; errorCode: string; timestamp: string },
): number {
  let score = 0;
  if (a.errorCode && a.errorCode === current.errorCode) score += 45;
  else if (a.fault && current.fault && a.fault === current.fault) score += 25;
  else if (
    a.fault &&
    current.fault &&
    (a.fault.includes(current.fault) || current.fault.includes(a.fault))
  ) {
    score += 15;
  }

  if (a.machine === current.machine) score += 15;
  else score += 4;

  try {
    const then = new Date(a.timestamp).getTime();
    const now = new Date(current.timestamp).getTime();
    if (!Number.isNaN(then) && !Number.isNaN(now) && now > then) {
      const months = (now - then) / (1000 * 60 * 60 * 24 * 30);
      score += Math.max(0, 10 - months);
    }
  } catch {
    // ignore unparseable dates
  }

  if (a.outcome === "failed") score += 3;
  else if (a.outcome === "partial") score += 2;

  return Math.min(98, score);
}

/**
 * Rank candidate experiences against the current incident.
 * Shared by both providers so ranking logic is auditable.
 */
export function rankExperiences(
  candidates: Array<Omit<RecalledExperience, "relevance">>,
  current: { machine: string; fault: string; errorCode: string; timestamp: string },
  limit = 3,
): RecalledExperience[] {
  return candidates
    .map((c) => ({ ...c, relevance: relevanceScore(c, current) }))
    .filter((c) => c.relevance >= 12)
    .sort((x, y) => y.relevance - x.relevance)
    .slice(0, limit);
}

/** Retain one experience. Uses the remote provider when configured. */
export async function retainExperience(
  input: RetainInput,
  fallback: () => Promise<RetainResult>,
): Promise<RetainResult> {
  if (!hindsightConfigured()) return fallback();

  try {
    const res = await fetch(`${HINDSIGHT_API_URL!.replace(/\/$/, "")}/retain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HINDSIGHT_API_KEY}`,
      },
      body: JSON.stringify({
        namespace: "fieldmemory",
        content: {
          machine: input.machine,
          fault: input.fault,
          error_code: input.errorCode,
          symptoms: input.symptoms,
          diagnosis: input.diagnosis,
          action: input.action,
          outcome: input.outcome,
          technician_notes: input.technicianNotes,
          technician: input.technician,
          severity: input.severity,
          timestamp: input.timestamp,
          learning: input.learning,
        },
        metadata: { product: "fieldmemory", version: 1 },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const fb = await fallback();
      return {
        ...fb,
        provider: "local",
        error: `Hindsight retain failed (${res.status}): ${text.slice(0, 140)}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string; memoryId?: string };
    return { ok: true, memoryId: data.id ?? data.memoryId, provider: "hindsight" };
  } catch (err) {
    const fb = await fallback();
    return {
      ...fb,
      provider: "local",
      error: `Hindsight unreachable: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

/** Recall experiences relevant to the current incident. */
export async function recallExperiences(
  current: { machine: string; fault: string; errorCode: string; timestamp: string },
  fallback: () => Promise<RecallResult>,
): Promise<RecallResult> {
  if (!hindsightConfigured()) return fallback();

  try {
    const res = await fetch(
      `${HINDSIGHT_API_URL!.replace(/\/$/, "")}/recall?q=${encodeURIComponent(
        `${current.machine} ${current.fault} ${current.errorCode}`,
      )}&limit=8`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${HINDSIGHT_API_KEY}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      const fb = await fallback();
      return {
        ...fb,
        provider: "local",
        error: `Hindsight recall failed (${res.status})`,
      };
    }
    const data = (await res.json().catch(() => [])) as Array<{
      id?: string;
      content?: Record<string, unknown>;
    }>;
    const nowIso = current.timestamp;
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
          timestamp: String(c.timestamp ?? nowIso),
          memoryCode: String(c.memory_code ?? m.id ?? ""),
          memoryId: String(m.id ?? ""),
        };
      }),
      current,
    );
    return { ok: true, experiences, provider: "hindsight" };
  } catch (err) {
    const fb = await fallback();
    return {
      ...fb,
      provider: "local",
      error: `Hindsight unreachable: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
