import { z } from "zod";
import {
  dailyCheckinSchema,
  partialPulseValuesSchema,
  scoresSchema,
} from "../../lib/health-data/model";

export const scenarioNames = [
  "no-block",
  "entry-block",
  "exit-block",
  "entry-exit",
  "kid-li",
  "missing-measurements",
  "improvement",
  "no-improvement",
  "boundary",
  "invalid",
] as const;

export const scenarioSchema = z.enum(scenarioNames);
export type SyntheticScenario = z.infer<typeof scenarioSchema>;

export const syntheticUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  baselineScores: scoresSchema,
  baselinePulses: partialPulseValuesSchema,
  isSynthetic: z.literal(true),
});

export const syntheticCheckinSchema = dailyCheckinSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().date(),
  isSynthetic: z.literal(true),
});

export const syntheticPulseSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().date(),
  phase: z.enum(["before", "after"]),
  scenario: scenarioSchema,
  values: partialPulseValuesSchema,
  measuredAt: z.string().datetime(),
  isSynthetic: z.literal(true),
});

export const syntheticInterventionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().date(),
  kind: z.enum(["entry-exit-pressure", "breathing", "quiet-rest"]),
  outcome: z.enum(["improved", "unchanged", "not-assessed"]),
  performedAt: z.string().datetime(),
  isSynthetic: z.literal(true),
});

export const syntheticDaySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().date(),
  scenario: scenarioSchema,
  checkin: syntheticCheckinSchema.nullable(),
  pulseBefore: syntheticPulseSessionSchema.nullable(),
  pulseAfter: syntheticPulseSessionSchema.nullable(),
  intervention: syntheticInterventionSchema.nullable(),
  isSynthetic: z.literal(true),
});

export const rejectedSyntheticRecordSchema = z.object({
  id: z.string().uuid(),
  scenario: z.literal("invalid"),
  record: z.record(z.string(), z.unknown()),
  expectedValidationErrors: z.array(z.string()).min(1),
  isSynthetic: z.literal(true),
});

export const syntheticDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  seed: z.number().int(),
  generatedAt: z.string().datetime(),
  users: z.array(syntheticUserSchema),
  days: z.array(syntheticDaySchema),
  rejectedRecords: z.array(rejectedSyntheticRecordSchema),
  isSynthetic: z.literal(true),
});

export type SyntheticUser = z.infer<typeof syntheticUserSchema>;
export type SyntheticCheckin = z.infer<typeof syntheticCheckinSchema>;
export type SyntheticPulseSession = z.infer<typeof syntheticPulseSessionSchema>;
export type SyntheticIntervention = z.infer<typeof syntheticInterventionSchema>;
export type SyntheticDay = z.infer<typeof syntheticDaySchema>;
export type RejectedSyntheticRecord = z.infer<
  typeof rejectedSyntheticRecordSchema
>;
export type SyntheticDataset = z.infer<typeof syntheticDatasetSchema>;
