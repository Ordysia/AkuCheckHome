export function assertSyntheticSeedAllowed(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const productionSignals = [
    environment.NODE_ENV === "production",
    environment.VERCEL_ENV === "production",
    environment.CF_PAGES_BRANCH === "main",
    environment.SITES_DEPLOYMENT === "production",
  ];
  if (productionSignals.some(Boolean)) {
    throw new Error("Synthetic seed is disabled in production environments.");
  }
}

export function assertSupabaseTargetAllowed(
  targetUrl: string,
  operation: "seed" | "clean",
  environment: NodeJS.ProcessEnv = process.env,
) {
  assertSyntheticSeedAllowed(environment);
  if (environment.ALLOW_SYNTHETIC_SEED !== "true") {
    throw new Error("Supabase seeding is locked. Set ALLOW_SYNTHETIC_SEED=true explicitly.");
  }

  let normalizedTarget: string;
  let normalizedAllowed: string;
  try {
    normalizedTarget = new URL(targetUrl).origin;
    normalizedAllowed = new URL(environment.ALLOW_SYNTHETIC_SUPABASE_URL ?? "").origin;
  } catch {
    throw new Error(
      "Set ALLOW_SYNTHETIC_SUPABASE_URL to the exact non-production Supabase origin.",
    );
  }
  if (normalizedTarget !== normalizedAllowed) {
    throw new Error("The Supabase target is not on the explicit non-production allowlist.");
  }
  if (
    operation === "clean" &&
    environment.CONFIRM_SYNTHETIC_CLEAN !== "DELETE SYNTHETIC DATA"
  ) {
    throw new Error(
      "Cleaning Supabase requires CONFIRM_SYNTHETIC_CLEAN=DELETE SYNTHETIC DATA.",
    );
  }
}
