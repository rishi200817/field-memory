// Retain pipeline: pushes a recorded repair outcome to Hindsight (or stamps
// the local adapter) and records the learning event. Invoked from the client
// after resolveIncident has persisted the memory row.
import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { hindsightConfigured } from "./hindsight";

export const retainToHindsight = action({
  args: {
    memoryId: v.id("memories"),
    machine: v.string(),
    fault: v.string(),
    errorCode: v.string(),
    symptoms: v.array(v.string()),
    diagnosis: v.string(),
    action: v.string(),
    outcome: v.union(v.literal("resolved"), v.literal("failed"), v.literal("partial")),
    technician: v.string(),
    technicianNotes: v.string(),
    learning: v.string(),
    severity: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    memoryId: string;
    provider: "hindsight" | "local";
    error?: string;
  }> => {
    const localFallback = async () => {
      await ctx.runMutation(api.retain.stampLocal, {
        memoryId: args.memoryId,
        externalId: undefined,
        provider: "local",
      });
      return { ok: true, memoryId: args.memoryId, provider: "local" as const };
    };

    let result: { ok: boolean; memoryId: string; provider: "hindsight" | "local"; error?: string };
    if (!hindsightConfigured()) {
      result = await localFallback();
    } else {
      try {
        const res = await fetch(
          `${process.env.HINDSIGHT_API_URL!.replace(/\/$/, "")}/retain`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.HINDSIGHT_API_KEY}`,
            },
            body: JSON.stringify({
              namespace: "fieldmemory",
              content: {
                machine: args.machine,
                fault: args.fault,
                error_code: args.errorCode,
                symptoms: args.symptoms,
                diagnosis: args.diagnosis,
                action: args.action,
                outcome: args.outcome,
                technician_notes: args.technicianNotes,
                technician: args.technician,
                severity: args.severity,
                timestamp: args.timestamp,
                learning: args.learning,
              },
              metadata: { product: "fieldmemory", version: 1 },
            }),
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const fb = await localFallback();
          result = {
            ...fb,
            error: `Hindsight retain failed (${res.status}): ${text.slice(0, 140)}`,
          };
        } else {
          const data = (await res.json().catch(() => ({}))) as {
            id?: string;
            memoryId?: string;
          };
          const externalId = data.id ?? data.memoryId;
          await ctx.runMutation(api.retain.stampLocal, {
            memoryId: args.memoryId,
            externalId,
            provider: "hindsight",
          });
          result = { ok: true, memoryId: args.memoryId, provider: "hindsight" };
        }
      } catch (err) {
        const fb = await localFallback();
        result = {
          ...fb,
          error: `Hindsight unreachable: ${err instanceof Error ? err.message : "unknown"}`,
        };
      }
    }

    await ctx.runMutation(api.learningEvents.insert, {
      kind: "experience_retained",
      title: `Experience retained — ${args.machine}`,
      detail: `${args.action} → ${args.outcome.toUpperCase()} retained via ${result.provider === "hindsight" ? "Hindsight" : "the local adapter"}${result.error ? ` (fallback: ${result.error})` : ""}.`,
      machineId: undefined,
      memoryId: undefined,
      timestamp: new Date().toISOString(),
    });

    return result;
  },
});

// Stamps the local memory row with the provider outcome.
export const stampLocal = mutation({
  args: {
    memoryId: v.id("memories"),
    externalId: v.optional(v.string()),
    provider: v.union(v.literal("hindsight"), v.literal("local")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      externalId: args.externalId,
      source: args.provider === "hindsight" ? "hindsight" : "local",
    });
    return { ok: true };
  },
});
