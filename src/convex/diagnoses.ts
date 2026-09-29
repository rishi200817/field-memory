import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insert = mutation({
  args: {
    incidentId: v.id("incidents"),
    memoryUsed: v.boolean(),
    generalDiagnosis: v.string(),
    recommendedSteps: v.array(v.string()),
    recalledMemoryIds: v.array(v.id("memories")),
    recalledSummary: v.string(),
    experienceDiagnosis: v.optional(v.string()),
    caveat: v.string(),
    usedLLM: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("diagnoses", { ...args, createdAt: Date.now() });
  },
});
