import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const severityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export const outcomeValidator = v.union(
  v.literal("resolved"),
  v.literal("failed"),
  v.literal("partial"),
  v.literal("open"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Industrial assets
    machines: defineTable({
      code: v.string(), // "C-17"
      name: v.string(), // "Compressor C-17"
      type: v.string(), // "Centrifugal Compressor"
      location: v.string(), // "Plant A - Unit 3"
      status: v.union(
        v.literal("online"),
        v.literal("degraded"),
        v.literal("offline"),
        v.literal("maintenance"),
      ),
      operatingHours: v.number(),
      lastService: v.string(), // ISO date
      critical: v.boolean(),
      telemetry: v.object({
        temperature: v.number(), // °C
        vibration: v.number(), // mm/s
        pressure: v.number(), // bar
      }),
      // rolling history for sparklines (newest last)
      telemetryHistory: v.object({
        temperature: v.array(v.number()),
        vibration: v.array(v.number()),
        pressure: v.array(v.number()),
      }),
      assetNumber: v.string(),
      manufacturer: v.string(),
      installedYear: v.number(),
    }).index("by_code", ["code"]),

    // Incident = fault event on a machine. Closed incidents are mirrored by memories.
    incidents: defineTable({
      code: v.string(), // "INC-C17-0926"
      machineId: v.id("machines"),
      date: v.string(), // ISO datetime
      fault: v.string(), // human description
      errorCode: v.string(), // "E204"
      severity: severityValidator,
      status: outcomeValidator, // open | resolved | failed | partial
      action: v.optional(v.string()), // repair performed
      outcome: v.optional(
        v.union(v.literal("resolved"), v.literal("failed"), v.literal("partial")),
      ),
      technician: v.optional(v.string()),
      technicianNotes: v.optional(v.string()),
      telemetry: v.object({
        temperature: v.number(),
        vibration: v.number(),
        pressure: v.number(),
      }),
      memoryId: v.optional(v.id("memories")),
    })
      .index("by_machine", ["machineId"])
      .index("by_status", ["status"])
      .index("by_code", ["code"]),

    // A retained experience — the persistent memory unit (Hindsight-backed)
    memories: defineTable({
      code: v.string(), // "MEM-C17-E204-0926"
      machineId: v.id("machines"),
      incidentId: v.optional(v.id("incidents")),
      fault: v.string(),
      errorCode: v.string(),
      symptoms: v.array(v.string()),
      diagnosis: v.string(),
      action: v.string(),
      outcome: v.union(
        v.literal("resolved"),
        v.literal("failed"),
        v.literal("partial"),
      ),
      technician: v.string(),
      technicianNotes: v.string(),
      learning: v.string(), // "What was learned"
      severity: severityValidator,
      timestamp: v.string(), // ISO datetime
      source: v.union(
        v.literal("seed"),
        v.literal("hindsight"),
        v.literal("local"),
        v.literal("simulation"),
      ),
      // link to external Hindsight memory when the provider is configured
      externalId: v.optional(v.string()),
    })
      .index("by_machine", ["machineId"])
      .index("by_code", ["code"])
      .index("by_timestamp", ["timestamp"]),

    // Append-only stream for the Learning page + overview feed
    learningEvents: defineTable({
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
    }).index("by_timestamp", ["timestamp"]),

    // Persisted AI diagnoses so users can compare memory on/off runs
    diagnoses: defineTable({
      incidentId: v.id("incidents"),
      memoryUsed: v.boolean(),
      generalDiagnosis: v.string(),
      recommendedSteps: v.array(v.string()),
      recalledMemoryIds: v.array(v.id("memories")),
      recalledSummary: v.optional(v.string()),
      experienceDiagnosis: v.optional(v.string()),
      caveat: v.string(),
      usedLLM: v.boolean(),
      createdAt: v.number(),
    }).index("by_incident", ["incidentId"]),

    // Single-row simulation bookkeeping
    simulationState: defineTable({
      stage: v.union(
        v.literal("idle"),
        v.literal("ran_without"),
        v.literal("ran_with"),
        v.literal("resolved"),
        v.literal("recalled_again"),
      ),
      round: v.number(),
      lastDiagnosis: v.optional(
        v.object({
          memoryUsed: v.boolean(),
          text: v.string(),
          steps: v.array(v.string()),
          recallCount: v.number(),
          usedLLM: v.boolean(),
          at: v.string(),
        }),
      ),
      simIncidentId: v.optional(v.id("incidents")),
      simMemoryIds: v.array(v.id("memories")),
      simEventIds: v.array(v.id("learningEvents")),
      updatedAt: v.number(),
    }),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
