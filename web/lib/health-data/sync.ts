import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyLocalHealthStore, localHealthStoreSchema, type LocalHealthStore } from "./model";

type HealthRecordRow = { record_date: string; checkin: unknown; pulses: unknown; wellbeing: unknown };

function newer<T extends { savedAt: string }>(local: T | undefined, remote: T | undefined) {
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(remote.savedAt) > Date.parse(local.savedAt) ? remote : local;
}

export function mergeHealthStores(local: LocalHealthStore, remote: LocalHealthStore) {
  const merged = emptyLocalHealthStore();
  const dates = new Set([...Object.keys(local.checkins), ...Object.keys(remote.checkins), ...Object.keys(local.pulses), ...Object.keys(remote.pulses), ...Object.keys(local.wellbeing ?? {}), ...Object.keys(remote.wellbeing ?? {})]);
  for (const date of dates) {
    const checkin = newer(local.checkins[date], remote.checkins[date]);
    const pulses = newer(local.pulses[date], remote.pulses[date]);
    const wellbeing = newer(local.wellbeing?.[date], remote.wellbeing?.[date]);
    if (checkin) merged.checkins[date] = checkin;
    if (pulses) merged.pulses[date] = pulses;
    if (wellbeing) (merged.wellbeing ??= {})[date] = wellbeing;
  }
  return localHealthStoreSchema.parse(merged);
}

function rowsToStore(rows: HealthRecordRow[]) {
  return localHealthStoreSchema.parse({
    checkins: Object.fromEntries(rows.filter((row) => row.checkin).map((row) => [row.record_date, row.checkin])),
    pulses: Object.fromEntries(rows.filter((row) => row.pulses).map((row) => [row.record_date, row.pulses])),
    wellbeing: Object.fromEntries(rows.filter((row) => row.wellbeing).map((row) => [row.record_date, row.wellbeing])),
  });
}

export async function synchronizeHealthStore(supabase: SupabaseClient, userId: string, local: LocalHealthStore) {
  const { data, error } = await supabase.from("user_health_records").select("record_date,checkin,pulses,wellbeing").order("record_date");
  if (error) throw error;
  const merged = mergeHealthStores(local, rowsToStore((data ?? []) as HealthRecordRow[]));
  const dates = new Set([...Object.keys(merged.checkins), ...Object.keys(merged.pulses), ...Object.keys(merged.wellbeing ?? {})]);
  if (dates.size) {
    const { error: uploadError } = await supabase.from("user_health_records").upsert([...dates].map((date) => ({ user_id: userId, record_date: date, checkin: merged.checkins[date] ?? null, pulses: merged.pulses[date] ?? null, wellbeing: merged.wellbeing?.[date] ?? null })), { onConflict: "user_id,record_date" });
    if (uploadError) throw uploadError;
  }
  return merged;
}

export async function uploadHealthDate(supabase: SupabaseClient, userId: string, date: string, store: LocalHealthStore) {
  const { error } = await supabase.from("user_health_records").upsert({ user_id: userId, record_date: date, checkin: store.checkins[date] ?? null, pulses: store.pulses[date] ?? null, wellbeing: store.wellbeing?.[date] ?? null }, { onConflict: "user_id,record_date" });
  if (error) throw error;
}
