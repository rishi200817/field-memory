import { query } from "./_generated/server";
import { v } from "convex/values";

export const listLearningEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("learningEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 200);
    return events;
  },
});

export const overviewFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("learningEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 6);
    return events;
  },
});
