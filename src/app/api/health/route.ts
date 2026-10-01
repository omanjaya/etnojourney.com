import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 2000;

/** Liveness + database readiness probe for load balancers and Docker HEALTHCHECK. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)),
    ]);
    return Response.json({ status: "ok", db: "ok" }, { headers });
  } catch {
    return Response.json({ status: "error", db: "error" }, { status: 503, headers });
  }
}
