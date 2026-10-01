/**
 * Runs once when a Next.js server instance starts. Validates the environment
 * so a misconfigured deploy fails fast instead of erroring on first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertValidEnv } = await import("./server/env-startup");
    assertValidEnv();
  }
}
