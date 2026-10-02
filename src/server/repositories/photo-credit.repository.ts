import "server-only";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { photoCredits, type PhotoCredit } from "@/server/db/schema";

export const photoCreditRepository = {
  async findByPaths(paths: string[]): Promise<Map<string, PhotoCredit>> {
    const unique = [...new Set(paths)].filter((p) => p.startsWith("/images/content/"));
    if (unique.length === 0) return new Map();
    const rows = await db.select().from(photoCredits).where(inArray(photoCredits.path, unique));
    return new Map(rows.map((row) => [row.path, row]));
  },

  listAll() {
    return db.select().from(photoCredits).orderBy(asc(photoCredits.path));
  },
};
