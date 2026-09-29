import { query } from "./_generated/server";
import { hindsightConfigured } from "./hindsight";

export const publicStatus = query({
  args: {},
  handler: async (ctx) => {
    const machines = await ctx.db.query("machines").collect();
    const incidents = await ctx.db.query("incidents").collect();
    const memories = await ctx.db.query("memories").collect();
    return {
      hindsightConfigured: hindsightConfigured(),
      aiConfigured: Boolean(process.env.VLY_INTEGRATION_KEY),
      counts: {
        machines: machines.length,
        incidents: incidents.length,
        memories: memories.length,
      },
      seeded: machines.length > 0,
    };
  },
});
