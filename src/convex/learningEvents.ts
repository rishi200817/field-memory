import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insert = mutation({
  args: {
    kind: v.union(
      v.literal("failed_repair_remembered"),
      v.literal("successful_repair_retained"),
      v.literal("recurring_fault_detected"),
      v.literal("technician_feedback_stored"),
      v.literal("experience_retained"),
      v.literal("recall_performed"),
      v.literal("recommendation_changed"),
    ),
    title: v.string(),
    detail: v.string(),
    machineId: v.optional(v.id("machines")),
    incidentId: v.optional(v.id("incidents")),
    memoryId: v.optional(v.id("memories")),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("learningEvents", args);
  },
});
