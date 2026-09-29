import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { memoryCodeFor } from "./codes";

export const listIncidents = query({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db.query("incidents").collect();
    const machines = await ctx.db.query("machines").collect();
    const byId = new Map(machines.map((m) => [m._id, m]));
    const out = incidents.map((i) => ({
      ...i,
      machine: byId.get(i.machineId)
        ? {
            _id: byId.get(i.machineId)!._id,
            name: byId.get(i.machineId)!.name,
            code: byId.get(i.machineId)!.code,
          }
        : null,
    }));
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  },
});

export const getIncident = query({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.id);
    if (!incident) return null;
    const machine = await ctx.db.get(incident.machineId);
    const diagnoses = await ctx.db
      .query("diagnoses")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.id))
      .collect();
    diagnoses.sort((a, b) => b.createdAt - a.createdAt);
    return { incident, machine, diagnoses };
  },
});

export const resolveIncident = mutation({
  args: {
    incidentId: v.id("incidents"),
    action: v.string(),
    technicianNotes: v.string(),
    result: v.union(v.literal("resolved"), v.literal("failed"), v.literal("partial")),
    technician: v.optional(v.string()),
    retain: v.boolean(),
    learning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    const machine = await ctx.db.get(incident.machineId);
    if (!machine) throw new Error("Machine not found");

    const now = new Date().toISOString();
    const tech = args.technician?.trim() || "Maintenance Team";

    const patch: Partial<typeof incident> = {
      status: args.result,
      outcome: args.result,
      action: args.action,
      technician: tech,
      technicianNotes: args.technicianNotes,
    };
    await ctx.db.patch(incident._id, patch);

    // Build the experience that will be retained in Hindsight
    const symptoms = [
      `Temperature ${incident.telemetry.temperature}°C`,
      `Vibration ${incident.telemetry.vibration} mm/s`,
      `Pressure ${incident.telemetry.pressure} bar`,
    ];
    const learning =
      args.learning?.trim() ||
      (args.result === "resolved"
        ? `${args.action} resolved ${incident.errorCode} on ${machine.name} — retain this sequence as the preferred first check.`
        : args.result === "failed"
          ? `${args.action} did not clear ${incident.errorCode} on ${machine.name} — do not repeat without addressing the root cause.`
          : `${args.action} partially improved ${incident.errorCode} on ${machine.name} — residual symptoms remain, monitor and re-check.`);

    // Local persistence (source of truth for the UI)
    const memoryCode = memoryCodeFor(machine.code, incident.errorCode, now);
    const memoryId = await ctx.db.insert("memories", {
      code: memoryCode,
      machineId: machine._id,
      incidentId: incident._id,
      fault: incident.fault,
      errorCode: incident.errorCode,
      symptoms,
      diagnosis: `FieldMemory diagnosis used ${incident.errorCode} history; technician performed: ${args.action}`,
      action: args.action,
      outcome: args.result,
      technician: tech,
      technicianNotes: args.technicianNotes,
      learning,
      severity: incident.severity,
      timestamp: now,
      source: hindsightSource(args.retain),
      externalId: undefined,
    });

    await ctx.db.patch(incident._id, { memoryId });

    const events = [];
    events.push(
      await ctx.db.insert("learningEvents", {
        kind:
          args.result === "failed"
            ? "failed_repair_remembered"
            : "successful_repair_retained",
        title:
          args.result === "failed"
            ? `Failed repair remembered — ${machine.name}`
            : `Successful repair retained — ${machine.name}`,
        detail: `${args.action} → ${args.result.toUpperCase()}. ${learning}`,
        machineId: machine._id,
        incidentId: incident._id,
        memoryId,
        timestamp: now,
      }),
    );
    if (args.technicianNotes.trim()) {
      events.push(
        await ctx.db.insert("learningEvents", {
          kind: "technician_feedback_stored",
          title: `Technician feedback stored — ${machine.name}`,
          detail: `"${args.technicianNotes.trim()}"`,
          machineId: machine._id,
          incidentId: incident._id,
          memoryId,
          timestamp: new Date(Date.now() + 1).toISOString(),
        }),
      );
    }

    return { memoryId, memoryCode, incidentId: incident._id, resolvedAt: now };
  },
});

function hindsightSource(retain: boolean): "hindsight" | "local" {
  // The action layer sets the real provider; the mutation only knows whether
  // the user asked to retain. Persist with the neutral "local" marker here and
  // the action flow stamps hindsight when the remote retain succeeds.
  return retain ? "hindsight" : "local";
}
