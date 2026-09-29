import { query } from "./_generated/server";
import { v } from "convex/values";

export const globalSearch = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const q = args.q.trim().toLowerCase();
    if (!q) return { machines: [], incidents: [], memories: [] };

    const machines = await ctx.db.query("machines").collect();
    const incidents = await ctx.db.query("incidents").collect();
    const memories = await ctx.db.query("memories").collect();

    const mResults = machines
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((m) => ({ id: m._id, label: m.name, meta: m.code, kind: "machine" as const }));

    const iResults = incidents
      .filter(
        (i) =>
          i.code.toLowerCase().includes(q) ||
          i.fault.toLowerCase().includes(q) ||
          i.errorCode.toLowerCase().includes(q) ||
          (i.action ?? "").toLowerCase().includes(q) ||
          (i.technician ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map((i) => ({
        id: i._id,
        label: `${i.code} — ${i.fault}`,
        meta: `${i.errorCode} · ${i.status.toUpperCase()}`,
        kind: "incident" as const,
      }));

    const memResults = memories
      .filter(
        (m) =>
          m.code.toLowerCase().includes(q) ||
          m.fault.toLowerCase().includes(q) ||
          m.errorCode.toLowerCase().includes(q) ||
          m.action.toLowerCase().includes(q) ||
          m.technician.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((m) => ({ id: m._id, label: m.code, meta: `${m.fault} · ${m.outcome.toUpperCase()}`, kind: "memory" as const }));

    return { machines: mResults, incidents: iResults, memories: memResults };
  },
});
