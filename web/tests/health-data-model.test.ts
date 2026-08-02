import assert from "node:assert/strict";
import test from "node:test";
import {
  completePulseValuesSchema,
  dailyCheckinSchema,
  isCompletePulseValues,
  localHealthStoreSchema,
  meridianCodes,
  normalizeAppPulseValues,
  partialPulseValuesSchema,
  scoresSchema,
  wellbeingEntrySchema,
} from "../lib/health-data/model";
import {
  claimLegacyHealthStore,
  healthStorageKey,
  LEGACY_HEALTH_STORAGE_KEY,
  readUserHealthStore,
  writeUserHealthStore,
} from "../lib/health-data/storage";

const completePulses = Object.fromEntries(
  meridianCodes.map((code) => [code, 0]),
);

test("scores accept only integer values from 1 to 5", () => {
  const valid = {
    sleep: 1,
    rested: 2,
    energy: 3,
    stress: 4,
    mood: 5,
    tension: 1,
  };

  assert.deepEqual(scoresSchema.parse(valid), valid);
  assert.equal(scoresSchema.safeParse({ ...valid, sleep: 0 }).success, false);
  assert.equal(scoresSchema.safeParse({ ...valid, mood: 6 }).success, false);
  assert.equal(scoresSchema.safeParse({ ...valid, energy: 2.5 }).success, false);
});

test("daily check-in validates clock times, limits and ISO timestamp", () => {
  const valid = {
    scores: {
      sleep: 3,
      rested: 3,
      energy: 3,
      stress: 3,
      mood: 3,
      tension: 3,
    },
    bedtime: "23:59",
    wakeTime: "00:00",
    symptoms: ["ból głowy"],
    otherSymptom: "",
    savedAt: "2026-08-02T18:30:00.000Z",
  };

  assert.equal(dailyCheckinSchema.safeParse(valid).success, true);
  assert.equal(dailyCheckinSchema.safeParse({ ...valid, bedtime: "24:00" }).success, false);
  assert.equal(dailyCheckinSchema.safeParse({ ...valid, wakeTime: "7:05" }).success, false);
  assert.equal(dailyCheckinSchema.safeParse({ ...valid, symptoms: [""] }).success, false);
  assert.equal(
    dailyCheckinSchema.safeParse({ ...valid, symptoms: Array(21).fill("objaw") }).success,
    false,
  );
  assert.equal(dailyCheckinSchema.safeParse({ ...valid, savedAt: "dzisiaj" }).success, false);
});

test("complete pulse values require all 12 canonical meridians", () => {
  assert.equal(completePulseValuesSchema.safeParse(completePulses).success, true);
  assert.equal(isCompletePulseValues(completePulses), true);

  const incomplete = Object.fromEntries(
    Object.entries(completePulses).filter(([code]) => code !== "TE"),
  );
  assert.equal(completePulseValuesSchema.safeParse(incomplete).success, false);
  assert.equal(partialPulseValuesSchema.safeParse(incomplete).success, true);
  assert.equal(isCompletePulseValues(incomplete), false);
});

test("pulse schemas reject out-of-range, fractional and unknown values", () => {
  assert.equal(partialPulseValuesSchema.safeParse({ HT: -2, TE: 2 }).success, true);
  assert.equal(partialPulseValuesSchema.safeParse({ HT: -3 }).success, false);
  assert.equal(partialPulseValuesSchema.safeParse({ HT: 1.5 }).success, false);
  assert.equal(partialPulseValuesSchema.safeParse({ HE: 1 }).success, false);
  assert.equal(completePulseValuesSchema.safeParse({ ...completePulses, EXTRA: 1 }).success, false);
});

test("app aliases are normalized and unknown codes are ignored", () => {
  assert.deepEqual(
    normalizeAppPulseValues({ HE: -2, LIV: -1, KID: 1, SJ: 2, LU: 0, UNKNOWN: 2 }),
    { HT: -2, LV: -1, KI: 1, TE: 2, LU: 0 },
  );
});

test("wellbeing entry enforces the 2000 character limit", () => {
  const savedAt = "2026-08-02T18:30:00.000Z";
  assert.equal(wellbeingEntrySchema.safeParse({ text: "a".repeat(2000), savedAt }).success, true);
  assert.equal(wellbeingEntrySchema.safeParse({ text: "a".repeat(2001), savedAt }).success, false);
});

class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

test("local health store rejects malformed records and excessive values", () => {
  assert.equal(localHealthStoreSchema.safeParse({}).success, false);
  assert.equal(localHealthStoreSchema.safeParse({ checkins: {}, pulses: { "2026-08-02": { values: { HT: 3 }, savedAt: "2026-08-02T18:30:00.000Z" } } }).success, false);
  assert.equal(localHealthStoreSchema.safeParse({ checkins: {}, pulses: {}, unknown: true }).success, false);
});

test("browser health data is isolated by user id and malformed JSON fails closed", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const first = { checkins: {}, pulses: {} };
  writeUserHealthStore(storage, "user/a", first);
  assert.deepEqual(readUserHealthStore(storage, "user/a"), first);
  assert.deepEqual(readUserHealthStore(storage, "user/b"), { checkins: {}, pulses: {} });
  storage.setItem(healthStorageKey("user/b"), "{}");
  assert.deepEqual(readUserHealthStore(storage, "user/b"), { checkins: {}, pulses: {} });
});

test("legacy data is assigned only after an explicit claim", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  storage.setItem(LEGACY_HEALTH_STORAGE_KEY, JSON.stringify({ checkins: {}, pulses: {} }));
  assert.deepEqual(readUserHealthStore(storage, "owner"), { checkins: {}, pulses: {} });
  claimLegacyHealthStore(storage, "owner");
  assert.equal(storage.getItem(LEGACY_HEALTH_STORAGE_KEY), null);
  assert.deepEqual(readUserHealthStore(storage, "owner"), { checkins: {}, pulses: {} });
});
