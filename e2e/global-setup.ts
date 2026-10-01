import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { assertTestDatabase, serverEnv, TEST_DATABASE_URL } from "./support/env";

/**
 * Prepares a clean test database: creates it if missing, applies migrations
 * and runs the seed. Runs once per `playwright test` invocation.
 */
export default async function globalSetup() {
  assertTestDatabase();
  await ensureDatabaseExists(TEST_DATABASE_URL);

  const env = { ...process.env, ...serverEnv() };
  const run = (args: string[]) => execFileSync("npx", args, { env, stdio: "inherit" });
  run(["drizzle-kit", "migrate"]);
  // Call tsx directly (not `npm run db:seed`) so `.env` can never redirect the seed.
  run(["tsx", "src/server/db/seed.ts"]);
}

async function ensureDatabaseExists(url: string) {
  const target = new URL(url);
  const name = target.pathname.replace(/^\//, "");
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const sql = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    const rows = await sql`select 1 from pg_database where datname = ${name}`;
    if (rows.length === 0) await sql.unsafe(`create database "${name.replace(/"/g, '""')}"`);
  } finally {
    await sql.end();
  }
}
