import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { rankExperiences } from "./hindsight";
import { memoryCodeFor } from "./codes";

export const listMemories = query({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query("memories").collect();
    const machines = await ctx.db.query("machines").collect();
    const byId = new Map(machines.map((m) => [m._id, m]));
    const out = memories.map((m) => ({
      ...m,
      machine: byId.get(m.machineId)
        ? {
            _id: byId.get(m.machineId)!._id,
            name: byId.get(m.machineId)!.name,
            code: byId.get(m.machineId)!.code,
          }
        : null,
    }));
    out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return out;
  },
});

export const memoryStats = query({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query("memories").collect();
    const incidents = await ctx.db.query("incidents").collect();
    const closed = incidents.filter((i) => i.status !== "open");
    const openIncidents = incidents.filter((i) => i.status === "open");

    // Recurring faults: same machine + error code seen more than once
    const byFaultKey = new Map<string, number>();
    for (const i of incidents) {
      const key = `${i.machineId}:${i.errorCode}`;
      byFaultKey.set(key, (byFaultKey.get(key) ?? 0) + 1);
    }
    const recurring = [...byFaultKey.values()].filter((n) => n > 1).length;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = memories.filter(
      (m) => new Date(m.timestamp).getTime() > oneWeekAgo,
    ).length;

    return {
      total: memories.length,
      successful: memories.filter((m) => m.outcome === "resolved").length,
      failed: memories.filter((m) => m.outcome === "failed").length,
      partial: memories.filter((m) => m.outcome === "partial").length,
      recurringFaults: recurring,
      recentlyRetained: recent,
      openIncidents: openIncidents.length,
      closedIncidents: closed.length,
    };
  },
});

export const getMemory = query({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.id);
    if (!memory) return null;
    const machine = await ctx.db.get(memory.machineId);
    const incident = memory.incidentId ? await ctx.db.get(memory.incidentId) : null;
    // Related memories: same machine or same error code, ranked deterministically
    const all = await ctx.db.query("memories").collect();
    const related = rankExperiences(
      all
        .filter((m) => m._id !== args.id)
        .map((m) => ({
          memoryId: m._id,
          memoryCode: m.code,
          machine: machine?.code ?? "",
          fault: m.fault,
          errorCode: m.errorCode,
          action: m.action,
          outcome: m.outcome,
          technicianNotes: m.technicianNotes,
          timestamp: m.timestamp,
        })),
      {
        machine: machine?.code ?? "",
        fault: memory.fault,
        errorCode: memory.errorCode,
        timestamp: memory.timestamp,
      },
      3,
    );
    return { memory, machine, incident, related };
  },
});

/**
 * Retain a new experience directly (used by Simulation "RECORD RESOLUTION" and
 * by the demo when no incident row exists yet). Also writes learning events.
 */
export const retainMemory = mutation({
  args: {
    machineId: v.id("machines"),
    fault: v.string(),
    errorCode: v.string(),
    symptoms: v.array(v.string()),
    diagnosis: v.string(),
    action: v.string(),
    outcome: v.union(v.literal("resolved"), v.literal("failed"), v.literal("partial")),
    technician: v.string(),
    technicianNotes: v.string(),
    learning: v.optional(v.string()),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    incidentId: v.optional(v.id("incidents")),
    source: v.optional(v.union(v.literal("hindsight"), v.literal("local"))),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.machineId);
    if (!machine) throw new Error("Machine not found");
    const now = new Date().toISOString();
    const code = memoryCodeFor(machine.code, args.errorCode, now);
    const learning =
      args.learning?.trim() ||
      (args.outcome === "resolved"
        ? `${args.action} resolved ${args.errorCode} on ${machine.name} — treat as the preferred first check for this fault signature.`
        : args.outcome === "failed"
          ? `${args.action} did not clear ${args.errorCode} on ${machine.name} — do not repeat without addressing the root cause.`
          : `${args.action} partially improved ${args.errorCode} on ${machine.name} — residual symptoms remain.`);

    const memoryId = await ctx.db.insert("memories", {
      code,
      machineId: machine._id,
      incidentId: args.incidentId,
      fault: args.fault,
      errorCode: args.errorCode,
      symptoms: args.symptoms,
      diagnosis: args.diagnosis,
      action: args.action,
      outcome: args.outcome,
      technician: args.technician,
      technicianNotes: args.technicianNotes,
      learning,
      severity: args.severity,
      timestamp: now,
      source: args.source ?? "local",
    });

    await ctx.db.insert("learningEvents", {
      kind:
        args.outcome === "failed"
          ? "failed_repair_remembered"
          : "successful_repair_retained",
      title:
        args.outcome === "failed"
          ? `Failed repair remembered — ${machine.name}`
          : `Successful repair retained — ${machine.name}`,
      detail: `${args.action} → ${args.outcome.toUpperCase()}. ${learning}`,
      machineId: machine._id,
      incidentId: args.incidentId,
      memoryId,
      timestamp: now,
    });

    return { memoryId, memoryCode: code, retainedAt: now };
  },
});
