import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getSimulationState = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    return (
      state ?? {
        stage: "idle" as const,
        round: 0,
        lastDiagnosis: undefined,
        simIncidentId: undefined,
        simMemoryIds: [] as Array<any>,
        simEventIds: [] as Array<any>,
        updatedAt: 0,
      }
    );
  },
});

export const setSimulationStage = mutation({
  args: {
    stage: v.union(
      v.literal("idle"),
      v.literal("ran_without"),
      v.literal("ran_with"),
      v.literal("resolved"),
      v.literal("recalled_again"),
    ),
    lastDiagnosis: v.optional(
      v.object({
        memoryUsed: v.boolean(),
        text: v.string(),
        steps: v.array(v.string()),
        recallCount: v.number(),
        usedLLM: v.boolean(),
        at: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("simulationState").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        stage: args.stage,
        lastDiagnosis: args.lastDiagnosis ?? existing.lastDiagnosis,
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert("simulationState", {
      stage: args.stage,
      round: 0,
      lastDiagnosis: args.lastDiagnosis,
      simIncidentId: undefined,
      simMemoryIds: [],
      simEventIds: [],
      updatedAt: now,
    });
  },
});

export const trackSimArtifacts = mutation({
  args: {
    incidentId: v.optional(v.id("incidents")),
    memoryId: v.optional(v.id("memories")),
    eventId: v.optional(v.id("learningEvents")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("simulationState").first();
    const now = Date.now();
    const simMemoryIds = args.memoryId
      ? [...(existing?.simMemoryIds ?? []), args.memoryId]
      : (existing?.simMemoryIds ?? []);
    const simEventIds = args.eventId
      ? [...(existing?.simEventIds ?? []), args.eventId]
      : (existing?.simEventIds ?? []);
    if (existing) {
      await ctx.db.patch(existing._id, {
        simIncidentId: args.incidentId ?? existing.simIncidentId,
        simMemoryIds,
        simEventIds,
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert("simulationState", {
      stage: "idle",
      round: 0,
      simIncidentId: args.incidentId,
      simMemoryIds,
      simEventIds,
      updatedAt: now,
    });
  },
});

/**
 * RESET SCENARIO: removes memory/events created during the simulation rounds
 * and restores the demo incident to its open state. Real seeded history stays.
 */
export const resetSimulation = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    const removed = { memories: 0, events: 0 };
    if (state) {
      for (const id of state.simMemoryIds) {
        const mem = await ctx.db.get(id);
        if (!mem) continue;
        // keep the link on incidents consistent
        if (mem.incidentId) {
          const inc = await ctx.db.get(mem.incidentId);
          if (inc && inc.memoryId === id) {
            await ctx.db.patch(inc._id, { memoryId: undefined });
          }
        }
        await ctx.db.delete(id);
        removed.memories++;
      }
      for (const id of state.simEventIds) {
        if (await ctx.db.get(id)) {
          await ctx.db.delete(id);
          removed.events++;
        }
      }
      // restore the sim incident to open, pre-resolution state
      if (state.simIncidentId) {
        const inc = await ctx.db.get(state.simIncidentId);
        if (inc) {
          await ctx.db.patch(inc._id, {
            status: "open",
            outcome: undefined,
            action: undefined,
            technician: undefined,
            technicianNotes: undefined,
            memoryId: undefined,
          });
        }
      }
      await ctx.db.delete(state._id);
    }
    return { ok: true, removed };
  },
});

export const bumpRound = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("simulationState").first();
    const now = Date.now();
    if (existing) {
      const round = existing.stage === "idle" ? 1 : existing.round + 1;
      await ctx.db.patch(existing._id, { round, updatedAt: now });
      return round;
    }
    await ctx.db.insert("simulationState", {
      stage: "idle",
      round: 1,
      simIncidentId: undefined,
      simMemoryIds: [],
      simEventIds: [],
      updatedAt: now,
    });
    return 1;
  },
});
