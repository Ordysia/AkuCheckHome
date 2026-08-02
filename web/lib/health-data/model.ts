import { z } from "zod";

export const meridianCodes = [
  "HT",
  "SI",
  "LV",
  "GB",
  "KI",
  "BL",
  "LU",
  "LI",
  "SP",
  "ST",
  "PC",
  "TE",
] as const;

export type MeridianCode = (typeof meridianCodes)[number];
export type PulseValue = -2 | -1 | 0 | 1 | 2;

export const scoresSchema = z.object({
  sleep: z.number().int().min(1).max(5),
  rested: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  tension: z.number().int().min(1).max(5),
});

export type Scores = z.infer<typeof scoresSchema>;

export const dailyCheckinSchema = z.object({
  scores: scoresSchema,
  bedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  wakeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  symptoms: z.array(z.string().min(1)).max(20),
  otherSymptom: z.string().max(100),
  savedAt: z.string().datetime(),
});

export type DailyCheckin = z.infer<typeof dailyCheckinSchema>;

const pulseShape = Object.fromEntries(
  meridianCodes.map((code) => [code, z.number().int().min(-2).max(2)]),
) as Record<MeridianCode, z.ZodNumber>;

export const completePulseValuesSchema = z.object(pulseShape).strict();
export const partialPulseValuesSchema = completePulseValuesSchema.partial();

export type CompletePulseValues = z.infer<typeof completePulseValuesSchema>;
export type PartialPulseValues = Partial<CompletePulseValues>;

export const pulseMeasurementSchema = z.object({
  values: partialPulseValuesSchema,
  savedAt: z.string().datetime(),
});

export type PulseMeasurement = z.infer<typeof pulseMeasurementSchema>;

export type LocalHealthStore = {
  checkins: Record<string, DailyCheckin>;
  pulses: Record<string, PulseMeasurement>;
};

export function isCompletePulseValues(
  values: PartialPulseValues,
): values is CompletePulseValues {
  return meridianCodes.every((code) => values[code] !== undefined);
}

export function normalizeAppPulseValues(
  values: Record<string, number>,
): PartialPulseValues {
  const aliases: Record<string, MeridianCode> = {
    HE: "HT",
    LIV: "LV",
    KID: "KI",
    SJ: "TE",
  };
  const normalized: PartialPulseValues = {};

  for (const [rawCode, value] of Object.entries(values)) {
    const code = (aliases[rawCode] ?? rawCode) as MeridianCode;
    if (meridianCodes.includes(code)) normalized[code] = value as PulseValue;
  }

  return normalized;
}
