import path from "node:path";
import { generateSyntheticDataset } from "./generator";
import { scenarioSchema, type SyntheticScenario } from "./model";
import { writeSyntheticExports } from "./export";
import {
  cleanSupabaseSyntheticData,
  openLocalSyntheticStore,
  seedSupabase,
} from "./storage";
import { assertSyntheticSeedAllowed } from "./safety";

type CliOptions = {
  users: number;
  days: number;
  seed: number;
  scenario?: SyntheticScenario;
  clean: boolean;
  target: "local" | "supabase" | "export";
  output: string;
  database: string;
};

function parseInteger(name: string, value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  let clean = false;
  for (const argument of argv) {
    if (argument === "--clean") {
      clean = true;
      continue;
    }
    const match = argument.match(/^--([a-z-]+)=(.+)$/);
    if (!match) throw new Error(`Unknown argument: ${argument}`);
    values.set(match[1], match[2]);
  }

  const target = values.get("target") ?? "local";
  if (!['local', 'supabase', 'export'].includes(target)) {
    throw new Error("--target must be local, supabase, or export");
  }
  const scenarioValue = values.get("scenario");

  return {
    users: parseInteger("users", values.get("users"), 5),
    days: parseInteger("days", values.get("days"), 10),
    seed: parseInteger("seed", values.get("seed"), 12345),
    scenario: scenarioValue ? scenarioSchema.parse(scenarioValue) : undefined,
    clean,
    target: target as CliOptions["target"],
    output: path.resolve(values.get("output") ?? "synthetic-output"),
    database: path.resolve(values.get("database") ?? "synthetic-output/akucheckhome.synthetic.sqlite"),
  };
}

async function main() {
  assertSyntheticSeedAllowed();
  const options = parseArgs(process.argv.slice(2));

  if (options.clean) {
    if (options.target === "supabase") {
      await cleanSupabaseSyntheticData();
      console.log("Removed Supabase records where is_synthetic = true.");
      return;
    }
    const store = await openLocalSyntheticStore(options.database);
    try {
      store.clean();
    } finally {
      store.close();
    }
    console.log(`Removed local records where is_synthetic = true: ${options.database}`);
    return;
  }

  const dataset = generateSyntheticDataset(options);
  const exportFiles = await writeSyntheticExports(dataset, options.output);
  if (options.target === "local") {
    const store = await openLocalSyntheticStore(options.database);
    try {
      store.seed(dataset);
    } finally {
      store.close();
    }
  } else if (options.target === "supabase") {
    await seedSupabase(dataset);
  }

  console.log(
    JSON.stringify(
      {
        users: dataset.users.length,
        days: dataset.days.length,
        rejectedRecords: dataset.rejectedRecords.length,
        target: options.target,
        database: options.target === "local" ? options.database : undefined,
        exports: exportFiles,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
