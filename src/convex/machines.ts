import { query } from "./_generated/server";
import { v } from "convex/values";

export const listMachines = query({
  args: {},
  handler: async (ctx) => {
    const machines = await ctx.db.query("machines").collect();
    // attach open incident counts + incident counts
    const incidents = await ctx.db.query("incidents").collect();
    return machines.map((m) => {
      const rel = incidents.filter((i) => i.machineId === m._id);
      return {
        ...m,
        incidentCount: rel.length,
        openIncidents: rel.filter((i) => i.status === "open").length,
      };
    });
  },
});

export const getMachine = query({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.id);
    if (!machine) return null;
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_machine", (q) => q.eq("machineId", args.id))
      .collect();
    incidents.sort((a, b) => b.date.localeCompare(a.date));
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_machine", (q) => q.eq("machineId", args.id))
      .collect();
    memories.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      machine,
      incidents,
      memories,
    };
  },
});

export const getMachineByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!machine) return null;
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_machine", (q) => q.eq("machineId", machine._id))
      .collect();
    incidents.sort((a, b) => b.date.localeCompare(a.date));
    return { machine, incidents };
  },
});
