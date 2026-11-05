import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { destinations, tours } from "@/server/db/schema";

/**
 * Every image slot the catalogue uses, one row per slot: tour covers, tour
 * galleries and destination heroes, with the owner (`kind`, `id`). Shared by
 * the credit queries and the upload cleanup so they agree on "in use".
 */
export const usedImagesSql = sql`
  select ${tours.coverImage} as path, 'tour' as kind, ${tours.id} as id from ${tours}
  union all select unnest(${tours.gallery}), 'tour', ${tours.id} from ${tours}
  union all select ${destinations.heroImage}, 'destination', ${destinations.id} from ${destinations}`;

export const mediaRepository = {
  /** Uploaded image URLs (under /media/) that a tour or destination uses. */
  async usedUploadPaths(): Promise<Set<string>> {
    const rows = await db.execute<{ path: string }>(sql`
      select distinct used.path from (${usedImagesSql}) as used
      where used.path like '/media/%'`);
    return new Set([...rows].map((row) => row.path));
  },
};
