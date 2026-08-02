import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  completePulseValuesSchema,
  isCompletePulseValues,
  meridianCodes,
} from "../lib/health-data/model";
import { analyzeEntryExitBlocks } from "../app/data/pulse-entry-exit-rules";
import { generateSyntheticDataset } from "../scripts/synthetic/generator";
import { syntheticPulseSessionSchema } from "../scripts/synthetic/model";
import { openLocalSyntheticStore } from "../scripts/synthetic/storage";
import { assertSupabaseTargetAllowed, assertSyntheticSeedAllowed } from "../scripts/synthetic/safety";

test("default dataset contains 5 users and 10 days per user", () => {
  const dataset = generateSyntheticDataset();
  assert.equal(dataset.users.length, 5);
  assert.equal(dataset.days.length, 50);
  for (const user of dataset.users) {
    assert.equal(dataset.days.filter((day) => day.userId === user.id).length, 10);
  }
});

test("the same seed produces byte-identical data", () => {
  const first = generateSyntheticDataset({ seed: 98765 });
  const second = generateSyntheticDataset({ seed: 98765 });
  assert.deepEqual(second, first);
});

test("valid pulses stay within -2..2 and complete sessions have 12 meridians", () => {
  const dataset = generateSyntheticDataset();
  for (const day of dataset.days) {
    for (const session of [day.pulseBefore, day.pulseAfter]) {
      if (!session) continue;
      for (const [code, value] of Object.entries(session.values)) {
        assert.ok(meridianCodes.includes(code as (typeof meridianCodes)[number]));
        assert.ok(value >= -2 && value <= 2);
      }
      if (isCompletePulseValues(session.values)) {
        assert.equal(Object.keys(session.values).length, 12);
        completePulseValuesSchema.parse(session.values);
      }
    }
  }
});

test("dates are ordered and child records use their day date", () => {
  const dataset = generateSyntheticDataset();
  for (const user of dataset.users) {
    const days = dataset.days.filter((day) => day.userId === user.id);
    assert.deepEqual(
      days.map((day) => day.date),
      [...days.map((day) => day.date)].sort(),
    );
    for (const day of days) {
      assert.equal(day.checkin?.date ?? day.date, day.date);
      assert.equal(day.pulseBefore?.date ?? day.date, day.date);
      assert.equal(day.pulseAfter?.date ?? day.date, day.date);
    }
  }
});

test("every persisted object is explicitly synthetic", () => {
  const dataset = generateSyntheticDataset();
  assert.equal(dataset.isSynthetic, true);
  for (const user of dataset.users) {
    assert.equal(user.isSynthetic, true);
    assert.match(user.displayName, /^Synthetic User \d{2}$/);
    assert.match(user.email, /^synthetic\.user\.\d{2}@example\.test$/);
  }
  for (const day of dataset.days) {
    assert.equal(day.isSynthetic, true);
    if (day.checkin) assert.equal(day.checkin.isSynthetic, true);
    if (day.pulseBefore) assert.equal(day.pulseBefore.isSynthetic, true);
    if (day.pulseAfter) assert.equal(day.pulseAfter.isSynthetic, true);
    if (day.intervention) assert.equal(day.intervention.isSynthetic, true);
  }
  for (const record of dataset.rejectedRecords) {
    assert.equal(record.isSynthetic, true);
    assert.equal(record.record.isSynthetic, true);
  }
});

test("invalid out-of-range records are rejected by shared validation", () => {
  const dataset = generateSyntheticDataset();
  for (const rejected of dataset.rejectedRecords) {
    const result = syntheticPulseSessionSchema.safeParse(rejected.record);
    assert.equal(result.success, false);
  }
});

test("Entry-Exit fixture uses the existing SI to BL rule", () => {
  const dataset = generateSyntheticDataset({ users: 1, days: 1, scenario: "entry-exit" });
  const values = dataset.days[0].pulseBefore?.values ?? {};
  const results = analyzeEntryExitBlocks(values);
  assert.ok(results.some((result) => result.id === "SI_TO_BL" && result.difference === 4));
});

test("KID-LI fixture is isolated without inventing a diagnostic rule", () => {
  const dataset = generateSyntheticDataset({ users: 1, days: 1, scenario: "kid-li" });
  const values = dataset.days[0].pulseBefore?.values ?? {};
  assert.equal(values.KI, -2);
  assert.equal(values.LI, 2);
  assert.equal(analyzeEntryExitBlocks(values).some((result) => result.transition.includes("KI → LI")), false);
});

test("all requested scenarios include missing, before/after and intervention outcomes", () => {
  const dataset = generateSyntheticDataset({ users: 1, days: 10 });
  assert.deepEqual(
    new Set(dataset.days.map((day) => day.scenario)),
    new Set([
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
    ]),
  );
  const improvement = dataset.days.find((day) => day.scenario === "improvement");
  assert.ok(improvement?.pulseBefore && improvement.pulseAfter);
  assert.equal(improvement.intervention?.outcome, "improved");
  const unchanged = dataset.days.find((day) => day.scenario === "no-improvement");
  assert.deepEqual(unchanged?.pulseAfter?.values, unchanged?.pulseBefore?.values);
  assert.equal(unchanged?.intervention?.outcome, "unchanged");
  const missing = dataset.days.find((day) => day.scenario === "missing-measurements");
  assert.ok(missing?.pulseBefore);
  assert.ok(Object.keys(missing.pulseBefore.values).length < 12);
  assert.equal(
    Object.keys(dataset.days.find((day) => day.scenario === "entry-block")?.pulseBefore?.values ?? {}).length,
    11,
  );
  assert.equal(
    Object.keys(dataset.days.find((day) => day.scenario === "exit-block")?.pulseBefore?.values ?? {}).length,
    11,
  );
});

test("production environment signals block the generator", () => {
  assert.throws(
    () => assertSyntheticSeedAllowed({ NODE_ENV: "production" }),
    /disabled in production/,
  );
  assert.doesNotThrow(() => assertSyntheticSeedAllowed({ NODE_ENV: "test" }));
});

test("Supabase target requires an exact allowlisted origin and clean confirmation", () => {
  const environment = { NODE_ENV: "test", ALLOW_SYNTHETIC_SEED: "true", ALLOW_SYNTHETIC_SUPABASE_URL: "https://safe-test.supabase.co" };
  assert.doesNotThrow(() => assertSupabaseTargetAllowed("https://safe-test.supabase.co", "seed", environment));
  assert.throws(() => assertSupabaseTargetAllowed("https://production.supabase.co", "seed", environment), /not on the explicit non-production allowlist/);
  assert.throws(() => assertSupabaseTargetAllowed("https://safe-test.supabase.co", "clean", environment), /CONFIRM_SYNTHETIC_CLEAN/);
  assert.doesNotThrow(() => assertSupabaseTargetAllowed("https://safe-test.supabase.co", "clean", { ...environment, CONFIRM_SYNTHETIC_CLEAN: "DELETE SYNTHETIC DATA" }));
});

test("local seeding is idempotent and clean removes only synthetic fixtures", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "akucheck-synthetic-"));
  const databasePath = path.join(directory, "test.sqlite");
  const dataset = generateSyntheticDataset({ users: 2, days: 3, seed: 77 });
  const store = await openLocalSyntheticStore(databasePath);
  try {
    store.seed(dataset);
    store.seed(dataset);
    store.close();
    const db = new DatabaseSync(databasePath);
    assert.equal(
      (db.prepare("select count(*) as count from synthetic_users").get() as { count: number }).count,
      2,
    );
    assert.equal(
      (db.prepare("select count(*) as count from daily_health_records").get() as { count: number }).count,
      6,
    );
    db.close();
    const cleanStore = await openLocalSyntheticStore(databasePath);
    cleanStore.clean();
    cleanStore.close();
    const cleanDb = new DatabaseSync(databasePath);
    assert.equal(
      (cleanDb.prepare("select count(*) as count from synthetic_users").get() as { count: number }).count,
      0,
    );
    cleanDb.close();
  } finally {
    try {
      store.close();
    } catch {}
    await rm(directory, { recursive: true, force: true });
  }
});
