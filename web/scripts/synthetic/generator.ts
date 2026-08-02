import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import {
  completePulseValuesSchema,
  meridianCodes,
  type CompletePulseValues,
  type MeridianCode,
  type PulseValue,
  type Scores,
} from "../../lib/health-data/model";
import {
  syntheticDatasetSchema,
  type SyntheticCheckin,
  type SyntheticDataset,
  type SyntheticDay,
  type SyntheticPulseSession,
  type SyntheticScenario,
  type SyntheticUser,
} from "./model";

export type GeneratorOptions = {
  users?: number;
  days?: number;
  seed?: number;
  scenario?: SyntheticScenario;
  anchorDate?: string;
};

const defaultScenarios: SyntheticScenario[] = [
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
];

const symptomPool = [
  "Zmęczenie",
  "Ból głowy",
  "Napięcie karku",
  "Zimne dłonie",
  "Wzdęcia",
  "Trudność z koncentracją",
  "Rozdrażnienie",
  "Niespokojny sen",
];

function deterministicUuid(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function clampPulse(value: number): PulseValue {
  return Math.max(-2, Math.min(2, value)) as PulseValue;
}

function clampScore(value: number) {
  return Math.max(1, Math.min(5, value));
}

function addDays(date: string, offset: number) {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function atTime(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

function baselinePulses(userIndex: number): CompletePulseValues {
  return Object.fromEntries(
    meridianCodes.map((code, index) => [
      code,
      clampPulse(((userIndex + index * 2) % 3) - 1),
    ]),
  ) as CompletePulseValues;
}

function dailyPulses(
  baseline: CompletePulseValues,
  userIndex: number,
  dayIndex: number,
) {
  return Object.fromEntries(
    meridianCodes.map((code, index) => {
      const drift = (userIndex * 7 + dayIndex * 3 + index) % 7 === 0 ? 1 : 0;
      const direction = (userIndex + dayIndex + index) % 2 === 0 ? 1 : -1;
      return [code, clampPulse(baseline[code] + drift * direction)];
    }),
  ) as CompletePulseValues;
}

function preventUnrelatedEntryExit(values: CompletePulseValues) {
  const pairs: Array<[MeridianCode, MeridianCode]> = [
    ["SI", "BL"],
    ["KI", "PC"],
    ["TE", "GB"],
    ["LV", "LU"],
    ["LI", "ST"],
    ["SP", "HT"],
  ];
  for (const [exit, entry] of pairs) {
    if (values[entry] > values[exit]) values[entry] = values[exit];
  }
  return values;
}

function scenarioPulses(
  scenario: SyntheticScenario,
  base: CompletePulseValues,
): {
  before: Partial<CompletePulseValues> | null;
  after: Partial<CompletePulseValues> | null;
  intervention: "improved" | "unchanged" | "not-assessed" | null;
} {
  const neutral = preventUnrelatedEntryExit({ ...base });

  switch (scenario) {
    case "no-block":
      return { before: neutral, after: null, intervention: null };
    case "entry-block": {
      const { SI: _missingExit, ...partial } = neutral;
      partial.BL = 2;
      return { before: partial, after: null, intervention: null };
    }
    case "exit-block": {
      const { BL: _missingEntry, ...partial } = neutral;
      partial.SI = -2;
      return { before: partial, after: null, intervention: null };
    }
    case "entry-exit":
      return {
        before: { ...neutral, SI: -2, BL: 2 },
        after: null,
        intervention: null,
      };
    case "kid-li":
      return {
        before: { ...neutral, KI: -2, LI: 2, PC: -2, ST: 2 },
        after: null,
        intervention: null,
      };
    case "missing-measurements": {
      const partial = { ...neutral } as Partial<CompletePulseValues>;
      delete partial.GB;
      delete partial.LU;
      delete partial.PC;
      return { before: partial, after: null, intervention: null };
    }
    case "improvement":
      return {
        before: { ...neutral, LI: -2, ST: 2 },
        after: { ...neutral, LI: 0, ST: 0 },
        intervention: "improved",
      };
    case "no-improvement":
      return {
        before: { ...neutral, SP: -1, HT: 2 },
        after: { ...neutral, SP: -1, HT: 2 },
        intervention: "unchanged",
      };
    case "boundary":
      return {
        before: Object.fromEntries(
          meridianCodes.map((code, index) => [code, index % 2 === 0 ? -2 : 2]),
        ) as CompletePulseValues,
        after: null,
        intervention: null,
      };
    case "invalid":
      return { before: null, after: null, intervention: null };
  }
}

function buildCheckin(
  seed: number,
  user: SyntheticUser,
  userIndex: number,
  dayIndex: number,
  date: string,
): SyntheticCheckin | null {
  if ((userIndex * 3 + dayIndex) % 17 === 11) return null;
  const drift = (keyIndex: number) =>
    ((seed + userIndex * 11 + dayIndex * 5 + keyIndex) % 3) - 1;
  const scoreEntries = Object.entries(user.baselineScores).map(
    ([key, value], index) => [key, clampScore(value + drift(index))],
  );
  const scores = Object.fromEntries(scoreEntries) as Scores;
  const symptoms = faker.helpers.arrayElements(symptomPool, {
    min: 0,
    max: Math.min(2, 1 + ((userIndex + dayIndex) % 2)),
  });

  return {
    id: deterministicUuid(`${seed}:checkin:${user.id}:${date}`),
    userId: user.id,
    date,
    scores,
    bedtime: `${String(21 + ((userIndex + dayIndex) % 3)).padStart(2, "0")}:${dayIndex % 2 ? "30" : "45"}`,
    wakeTime: `0${6 + ((userIndex + dayIndex) % 2)}:${dayIndex % 3 === 0 ? "15" : "30"}`,
    symptoms,
    otherSymptom: "",
    savedAt: atTime(date, "07:45"),
    isSynthetic: true,
  };
}

function pulseSession(
  seed: number,
  userId: string,
  date: string,
  phase: "before" | "after",
  scenario: SyntheticScenario,
  values: Partial<CompletePulseValues> | null,
): SyntheticPulseSession | null {
  if (!values) return null;
  return {
    id: deterministicUuid(`${seed}:pulse:${userId}:${date}:${phase}`),
    userId,
    date,
    phase,
    scenario,
    values,
    measuredAt: atTime(date, phase === "before" ? "08:00" : "08:20"),
    isSynthetic: true,
  };
}

export function generateSyntheticDataset(
  options: GeneratorOptions = {},
): SyntheticDataset {
  const userCount = options.users ?? 5;
  const dayCount = options.days ?? 10;
  const seed = options.seed ?? 12345;
  const anchorDate = options.anchorDate ?? "2026-07-30";
  if (userCount < 1 || dayCount < 1) {
    throw new Error("users and days must be positive integers");
  }

  faker.seed(seed);
  const users: SyntheticUser[] = Array.from({ length: userCount }, (_, index) => {
    const syntheticNumber = String(index + 1).padStart(2, "0");
    const id = deterministicUuid(`${seed}:user:${index}`);
    return {
      id,
      email: `synthetic.user.${syntheticNumber}@example.test`,
      displayName: `Synthetic User ${syntheticNumber}`,
      baselineScores: {
        sleep: 2 + ((index + 1) % 4),
        rested: 2 + ((index + 2) % 4),
        energy: 2 + (index % 4),
        stress: 2 + ((index + 3) % 4),
        mood: 2 + ((index + 1) % 4),
        tension: 2 + ((index + 2) % 4),
      },
      baselinePulses: baselinePulses(index),
      isSynthetic: true,
    };
  });

  const days: SyntheticDay[] = [];
  for (const [userIndex, user] of users.entries()) {
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      const date = addDays(anchorDate, dayIndex - dayCount + 1);
      const scenario =
        options.scenario ?? defaultScenarios[dayIndex % defaultScenarios.length];
      const base = dailyPulses(
        completePulseValuesSchema.parse(user.baselinePulses),
        userIndex,
        dayIndex,
      );
      const pulseData = scenarioPulses(scenario, base);
      const intervention = pulseData.intervention
        ? {
            id: deterministicUuid(`${seed}:intervention:${user.id}:${date}`),
            userId: user.id,
            date,
            kind: "entry-exit-pressure" as const,
            outcome: pulseData.intervention,
            performedAt: atTime(date, "08:10"),
            isSynthetic: true as const,
          }
        : null;

      days.push({
        id: deterministicUuid(`${seed}:day:${user.id}:${date}`),
        userId: user.id,
        date,
        scenario,
        checkin: buildCheckin(seed, user, userIndex, dayIndex, date),
        pulseBefore: pulseSession(
          seed,
          user.id,
          date,
          "before",
          scenario,
          pulseData.before,
        ),
        pulseAfter: pulseSession(
          seed,
          user.id,
          date,
          "after",
          scenario,
          pulseData.after,
        ),
        intervention,
        isSynthetic: true,
      });
    }
  }

  const rejectedRecords = users.map((user, index) => ({
    id: deterministicUuid(`${seed}:invalid:${user.id}`),
    scenario: "invalid" as const,
    record: {
      id: deterministicUuid(`${seed}:invalid-pulse:${user.id}`),
      userId: user.id,
      date: addDays(anchorDate, -index),
      phase: "before",
      scenario: "invalid",
      values: { ...baselinePulses(index), KI: -3, LI: 3 },
      measuredAt: atTime(addDays(anchorDate, -index), "08:00"),
      isSynthetic: true,
    },
    expectedValidationErrors: ["KI: value must be >= -2", "LI: value must be <= 2"],
    isSynthetic: true as const,
  }));

  return syntheticDatasetSchema.parse({
    schemaVersion: 1,
    seed,
    generatedAt: `${anchorDate}T00:00:00.000Z`,
    users,
    days,
    rejectedRecords,
    isSynthetic: true,
  });
}
