import { query } from "./_generated/server";
import { v } from "convex/values";

export const overviewStats = query({
  args: {},
  handler: async (ctx) => {
    const machines = await ctx.db.query("machines").collect();
    const incidents = await ctx.db.query("incidents").collect();
    const memories = await ctx.db.query("memories").collect();

    const openIncidents = incidents.filter((i) => i.status === "open");
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // "Successful recommendations": diagnoses run with memory ON that were
    // followed by a resolved incident recorded against that machine/fault.
    const diagnoses = await ctx.db.query("diagnoses").collect();
    const resolvedFaultKeys = new Set(
      incidents
        .filter((i) => i.outcome === "resolved")
        .map((i) => `${i.machineId}:${i.errorCode}`),
    );
    const successfulRecs = diagnoses.filter(
      (d) =>
        d.memoryUsed &&
        incidents.some(
          (i) =>
            i._id === d.incidentId &&
            (i.outcome === "resolved" || resolvedFaultKeys.has(`${i.machineId}:${i.errorCode}`)),
        ),
    ).length;

    return {
      activeIncidents: openIncidents.length,
      machinesOnline: machines.filter((m) => m.status === "online").length,
      machinesTotal: machines.length,
      criticalMachines: machines.filter((m) => m.critical).length,
      resolvedToday: incidents.filter(
        (i) => i.outcome === "resolved" && new Date(i.date).getTime() > oneDayAgo,
      ).length,
      memoriesStored: memories.length,
      successfulRecommendations: successfulRecs,
      openCritical: openIncidents.filter((i) => i.severity === "critical").length,
    };
  },
});

export const activeIncidentCard = query({
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db
      .query("incidents")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    open.sort((a, b) => b.date.localeCompare(a.date));
    const first = open[0];
    if (!first) return null;
    const machine = await ctx.db.get(first.machineId);
    return { incident: first, machine };
  },
});
