import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import type { SyntheticDataset } from "./model";

function bool(value: boolean) {
  return value ? 1 : 0;
}

export class LocalSyntheticStore {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS synthetic_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        baseline_scores TEXT NOT NULL,
        baseline_pulses TEXT NOT NULL,
        is_synthetic INTEGER NOT NULL CHECK (is_synthetic = 1)
      );
      CREATE TABLE IF NOT EXISTS daily_health_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        record_date TEXT NOT NULL,
        checkin TEXT,
        scenario TEXT NOT NULL,
        is_synthetic INTEGER NOT NULL CHECK (is_synthetic = 1),
        UNIQUE(user_id, record_date)
      );
      CREATE TABLE IF NOT EXISTS pulse_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        record_date TEXT NOT NULL,
        phase TEXT NOT NULL,
        scenario TEXT NOT NULL,
        values_json TEXT NOT NULL,
        measured_at TEXT NOT NULL,
        is_synthetic INTEGER NOT NULL CHECK (is_synthetic = 1),
        UNIQUE(user_id, record_date, phase)
      );
      CREATE TABLE IF NOT EXISTS interventions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        record_date TEXT NOT NULL,
        kind TEXT NOT NULL,
        outcome TEXT NOT NULL,
        performed_at TEXT NOT NULL,
        is_synthetic INTEGER NOT NULL CHECK (is_synthetic = 1),
        UNIQUE(user_id, record_date)
      );
    `);
  }

  seed(dataset: SyntheticDataset) {
    const userStatement = this.db.prepare(`
      INSERT INTO synthetic_users (id, email, display_name, baseline_scores, baseline_pulses, is_synthetic)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email=excluded.email, display_name=excluded.display_name,
        baseline_scores=excluded.baseline_scores,
        baseline_pulses=excluded.baseline_pulses,
        is_synthetic=excluded.is_synthetic
    `);
    const dayStatement = this.db.prepare(`
      INSERT INTO daily_health_records (id, user_id, record_date, checkin, scenario, is_synthetic)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        checkin=excluded.checkin, scenario=excluded.scenario,
        is_synthetic=excluded.is_synthetic
    `);
    const pulseStatement = this.db.prepare(`
      INSERT INTO pulse_sessions (id, user_id, record_date, phase, scenario, values_json, measured_at, is_synthetic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        scenario=excluded.scenario, values_json=excluded.values_json,
        measured_at=excluded.measured_at, is_synthetic=excluded.is_synthetic
    `);
    const interventionStatement = this.db.prepare(`
      INSERT INTO interventions (id, user_id, record_date, kind, outcome, performed_at, is_synthetic)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind=excluded.kind, outcome=excluded.outcome,
        performed_at=excluded.performed_at, is_synthetic=excluded.is_synthetic
    `);

    this.db.exec("BEGIN");
    try {
      for (const user of dataset.users) {
        userStatement.run(
          user.id,
          user.email,
          user.displayName,
          JSON.stringify(user.baselineScores),
          JSON.stringify(user.baselinePulses),
          bool(user.isSynthetic),
        );
      }
      for (const day of dataset.days) {
        dayStatement.run(
          day.id,
          day.userId,
          day.date,
          day.checkin ? JSON.stringify(day.checkin) : null,
          day.scenario,
          bool(day.isSynthetic),
        );
        for (const session of [day.pulseBefore, day.pulseAfter]) {
          if (!session) continue;
          pulseStatement.run(
            session.id,
            session.userId,
            session.date,
            session.phase,
            session.scenario,
            JSON.stringify(session.values),
            session.measuredAt,
            bool(session.isSynthetic),
          );
        }
        if (day.intervention) {
          interventionStatement.run(
            day.intervention.id,
            day.intervention.userId,
            day.intervention.date,
            day.intervention.kind,
            day.intervention.outcome,
            day.intervention.performedAt,
            bool(day.intervention.isSynthetic),
          );
        }
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  clean() {
    this.db.exec("BEGIN");
    try {
      for (const table of [
        "interventions",
        "pulse_sessions",
        "daily_health_records",
        "synthetic_users",
      ]) {
        this.db.exec(`DELETE FROM ${table} WHERE is_synthetic = 1`);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

export async function openLocalSyntheticStore(databasePath: string) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  return new LocalSyntheticStore(databasePath);
}

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase target requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }
  if (process.env.ALLOW_SYNTHETIC_SEED !== "true") {
    throw new Error(
      "Supabase seeding is locked. Set ALLOW_SYNTHETIC_SEED=true explicitly.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireNoSupabaseError(
  result: { error: { message: string } | null },
  operation: string,
) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
}

export async function seedSupabase(dataset: SyntheticDataset) {
  const supabase = supabaseClient();
  await requireNoSupabaseError(
    await supabase.from("synthetic_users").upsert(
      dataset.users.map((user) => ({
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        baseline_scores: user.baselineScores,
        baseline_pulses: user.baselinePulses,
        is_synthetic: user.isSynthetic,
      })),
    ),
    "upsert synthetic_users",
  );
  await requireNoSupabaseError(
    await supabase.from("daily_health_records").upsert(
      dataset.days.map((day) => ({
        id: day.id,
        user_id: day.userId,
        record_date: day.date,
        checkin: day.checkin,
        scenario: day.scenario,
        is_synthetic: day.isSynthetic,
      })),
    ),
    "upsert daily_health_records",
  );
  const sessions = dataset.days.flatMap((day) =>
    [day.pulseBefore, day.pulseAfter]
      .filter((session) => session !== null)
      .map((session) => ({
        id: session.id,
        user_id: session.userId,
        record_date: session.date,
        phase: session.phase,
        scenario: session.scenario,
        values_json: session.values,
        measured_at: session.measuredAt,
        is_synthetic: session.isSynthetic,
      })),
  );
  await requireNoSupabaseError(
    await supabase.from("pulse_sessions").upsert(sessions),
    "upsert pulse_sessions",
  );
  const interventions = dataset.days
    .map((day) => day.intervention)
    .filter((value) => value !== null)
    .map((intervention) => ({
      id: intervention.id,
      user_id: intervention.userId,
      record_date: intervention.date,
      kind: intervention.kind,
      outcome: intervention.outcome,
      performed_at: intervention.performedAt,
      is_synthetic: intervention.isSynthetic,
    }));
  if (interventions.length > 0) {
    await requireNoSupabaseError(
      await supabase.from("interventions").upsert(interventions),
      "upsert interventions",
    );
  }
}

export async function cleanSupabaseSyntheticData() {
  const supabase = supabaseClient();
  for (const table of [
    "interventions",
    "pulse_sessions",
    "daily_health_records",
    "synthetic_users",
  ]) {
    await requireNoSupabaseError(
      await supabase.from(table).delete().eq("is_synthetic", true),
      `clean ${table}`,
    );
  }
}
