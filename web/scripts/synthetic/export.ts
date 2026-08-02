import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SyntheticDataset } from "./model";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ].join("\n");
}

export async function writeSyntheticExports(
  dataset: SyntheticDataset,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });
  const pulseSessions = dataset.days.flatMap((day) =>
    [day.pulseBefore, day.pulseAfter].filter((value) => value !== null),
  );
  const interventions = dataset.days
    .map((day) => day.intervention)
    .filter((value) => value !== null);
  const checkins = dataset.days
    .map((day) => day.checkin)
    .filter((value) => value !== null);

  const files: Record<string, string> = {
    "synthetic-data.json": `${JSON.stringify(dataset, null, 2)}\n`,
    "users.csv": toCsv(dataset.users),
    "days.csv": toCsv(
      dataset.days.map(({ checkin: _c, pulseBefore: _b, pulseAfter: _a, intervention: _i, ...day }) => day),
    ),
    "checkins.csv": toCsv(checkins),
    "pulse-sessions.csv": toCsv(pulseSessions),
    "interventions.csv": toCsv(interventions),
    "rejected-records.csv": toCsv(dataset.rejectedRecords),
  };

  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(path.join(outputDirectory, name), `${content}\n`, "utf8"),
    ),
  );

  return Object.keys(files).map((name) => path.join(outputDirectory, name));
}
