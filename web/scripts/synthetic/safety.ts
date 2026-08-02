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
