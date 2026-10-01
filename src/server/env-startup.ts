import { checkEnv } from "./env";

/**
 * Node-only startup check, loaded from `src/instrumentation.ts`.
 * Logs warnings, and on invalid configuration lists the problems (never the
 * values) and stops the process in production so orchestrators see the failure.
 */
export function assertValidEnv(): void {
  const result = checkEnv(process.env);
  for (const warning of result.warnings) console.warn(`[env] ${warning}`);
  if (result.ok) return;

  const list = result.errors.map((error) => `  - ${error}`).join("\n");
  console.error(`[env] Invalid environment configuration:\n${list}`);
  // A thrown error only fails requests; exiting lets Docker/systemd/PaaS restart and alert.
  if (process.env.NODE_ENV === "production") process.exit(1);
  throw new Error("Invalid environment configuration. See the [env] errors above.");
}
