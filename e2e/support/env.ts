/**
 * Shared configuration for the end-to-end suite. Everything here points at a
 * dedicated test database and server so the suite never touches dev data.
 */
export const PORT = Number(process.env.E2E_PORT ?? 3460);
export const BASE_URL = `http://localhost:${PORT}`;

export const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://localhost:5432/etnojourney_test";

/** Dummy key: enables the Midtrans webhook path; never valid against Midtrans. */
export const MIDTRANS_TEST_KEY = "SB-Mid-server-e2e-not-a-real-key";

const AUTH_SECRET = "e2e-only-secret-do-not-use-in-production-0123456789";

export const ACCOUNTS = {
  traveler: { email: "traveler@etnojourney.id", password: "Traveler123!", name: "Nadia Putri" },
  admin: { email: "admin@etnojourney.id", password: "Admin12345!", name: "Admin EtnoJourney" },
} as const;

export const STORAGE_STATE = {
  traveler: "e2e/.auth/traveler.json",
  admin: "e2e/.auth/admin.json",
} as const;

/** Refuses to run against anything that isn't clearly a test database. */
export function assertTestDatabase(url: string = TEST_DATABASE_URL): void {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`E2E refuses to use database "${name}": its name must end with "_test".`);
  }
}

/** Environment for the app server and the seed script under test. */
export function serverEnv(): Record<string, string> {
  assertTestDatabase();
  return {
    DATABASE_URL: TEST_DATABASE_URL,
    BETTER_AUTH_SECRET: AUTH_SECRET,
    BETTER_AUTH_URL: BASE_URL,
    SITE_URL: BASE_URL,
    MIDTRANS_SERVER_KEY: MIDTRANS_TEST_KEY,
    MIDTRANS_IS_PRODUCTION: "false",
    UPLOAD_DIR: "./storage/e2e-uploads",
    // Never send real email from tests.
    RESEND_API_KEY: "",
    // Serve image files as-is; see next.config.ts.
    NEXT_IMAGE_UNOPTIMIZED: "true",
    SEED_ADMIN_EMAIL: ACCOUNTS.admin.email,
    SEED_ADMIN_PASSWORD: ACCOUNTS.admin.password,
  };
}
