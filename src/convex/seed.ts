// Idempotent demo-data bootstrap: writes machines, incidents, memories and
// learning events from seedData. Invoked from the client on first load.
import { mutation } from "./_generated/server";
import { seedMachines, seedIncidents, seedMemories } from "./seedData";

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("machines").collect();
    if (existing.length > 0) {
      return { seeded: false, machines: existing.length, incidents: 0, memories: 0 };
    }

    const machineIds = new Map<string, any>();
    for (const m of seedMachines) {
      const id = await ctx.db.insert("machines", {
        code: m.code,
        name: m.name,
        type: m.type,
        location: m.location,
        status: m.status,
        operatingHours: m.operatingHours,
        lastService: m.lastService,
        critical: m.critical,
        telemetry: m.telemetry,
        telemetryHistory: m.telemetryHistory,
        assetNumber: m.assetNumber,
        manufacturer: m.manufacturer,
        installedYear: m.installedYear,
      });
      machineIds.set(m.code, id);
    }

    const incidentIds = new Map<string, any>();
    let count = 0;
    for (const i of seedIncidents) {
      const machineId = machineIds.get(i.machineCode);
      if (!machineId) continue;
      const id = await ctx.db.insert("incidents", {
        code: i.code,
        machineId,
        date: i.date,
        fault: i.fault,
        errorCode: i.errorCode,
        severity: i.severity,
        status: i.status,
        action: i.action,
        outcome: i.outcome,
        technician: i.technician,
        technicianNotes: i.technicianNotes,
        telemetry: i.telemetry,
      });
      incidentIds.set(i.code, id);
      count++;
    }

    for (const m of seedMemories) {
      const machineId = machineIds.get(m.machineCode);
      const incidentId = incidentIds.get(m.incidentCode);
      if (!machineId) continue;
      const memoryId = await ctx.db.insert("memories", {
        code: m.code,
        machineId,
        incidentId,
        fault: m.fault,
        errorCode: m.errorCode,
        symptoms: m.symptoms,
        diagnosis: m.diagnosis,
        action: m.action,
        outcome: m.outcome,
        technician: m.technician,
        technicianNotes: m.technicianNotes,
        learning: m.learning,
        severity: m.severity,
        timestamp: m.timestamp,
        source: "seed" as const,
      });
      if (incidentId) {
        await ctx.db.patch(incidentId, { memoryId });
      }
    }

    // Learning events for the Learning page / Overview feed — derived from the
    // seeded history above, not invented claims.
    const events = [
      {
        kind: "failed_repair_remembered" as const,
        title: "Failed repair remembered — Compressor C-17",
        detail:
          "Bearing replacement (19 Sep 2026) did not clear E204. Recorded as a failed repair for future recall.",
        machineCode: "C-17",
        timestamp: "2026-09-19T16:45:00Z",
      },
      {
        kind: "successful_repair_retained" as const,
        title: "Successful repair retained — Compressor C-17",
        detail:
          "Alignment correction (03 Aug 2026) resolved E204. Retained as the preferred first check.",
        machineCode: "C-17",
        timestamp: "2026-08-03T11:30:00Z",
      },
      {
        kind: "recurring_fault_detected" as const,
        title: "Recurring fault detected — Compressor C-17",
        detail:
          "E204 recorded 4 times on C-17 since Nov 2025. Memory layer flags this fault signature as recurring.",
        machineCode: "C-17",
        timestamp: "2026-09-26T10:24:00Z",
      },
      {
        kind: "technician_feedback_stored" as const,
        title: "Technician feedback stored — Turbine T-03",
        detail:
          "\"Replaced #2 journal bearing. Vibration unchanged. Balancing plant visit needed.\" — Karthik R.",
        machineCode: "T-03",
        timestamp: "2026-04-18T10:05:00Z",
      },
    ];
    for (const e of events) {
      const machineId = machineIds.get(e.machineCode);
      await ctx.db.insert("learningEvents", {
        kind: e.kind,
        title: e.title,
        detail: e.detail,
        machineId: machineId ?? undefined,
        timestamp: e.timestamp,
      });
    }

    return {
      seeded: true,
      machines: machineIds.size,
      incidents: count,
      memories: seedMemories.length,
    };
  },
});
