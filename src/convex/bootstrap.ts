// Client-invoked bootstrap action: seeds demo data when the database is empty.
import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";

export const seedIfEmpty = action({
  args: {},
  handler: async (ctx): Promise<{ seeded: boolean; machines: number }> => {
    const machines = await ctx.runQuery(api.machines.listMachines, {});
    if (machines.length > 0) {
      return { seeded: false, machines: machines.length };
    }
    const r = await ctx.runMutation(api.seed.seedDemoData, {});
    return { seeded: r.seeded, machines: r.machines };
  },
});

export const seedStatus = query({
  args: {},
  handler: async (ctx) => {
    const machines = await ctx.db.query("machines").collect();
    const incidents = await ctx.db.query("incidents").collect();
    const memories = await ctx.db.query("memories").collect();
    return {
      machines: machines.length,
      incidents: incidents.length,
      memories: memories.length,
      seeded: machines.length > 0,
    };
  },
});
