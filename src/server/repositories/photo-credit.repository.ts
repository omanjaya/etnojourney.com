import "server-only";
import { asc, count, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { photoCredits, type PhotoCredit } from "@/server/db/schema";

/** Curated content photos and admin uploads can both carry a credit. */
const CREDITABLE_PREFIXES = ["/images/content/", "/media/"];

export type PhotoCreditValues = Omit<typeof photoCredits.$inferInsert, "path">;

export const photoCreditRepository = {
  async findByPaths(paths: string[]): Promise<Map<string, PhotoCredit>> {
    const unique = [...new Set(paths)].filter((p) =>
      CREDITABLE_PREFIXES.some((prefix) => p.startsWith(prefix)),
    );
    if (unique.length === 0) return new Map();
    const rows = await db.select().from(photoCredits).where(inArray(photoCredits.path, unique));
    return new Map(rows.map((row) => [row.path, row]));
  },

  listAll() {
    return db.select().from(photoCredits).orderBy(asc(photoCredits.path));
  },

  findByPath(path: string) {
    return db
      .select()
      .from(photoCredits)
      .where(eq(photoCredits.path, path))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /** Admin list, searched across path, title, author, license and source. */
  search(q: string | undefined, limit: number, offset: number) {
    return db
      .select()
      .from(photoCredits)
      .where(searchCondition(q))
      .orderBy(asc(photoCredits.path))
      .limit(limit)
      .offset(offset);
  },

  count(q: string | undefined): Promise<number> {
    return db
      .select({ total: count() })
      .from(photoCredits)
      .where(searchCondition(q))
      .then((rows) => rows[0]?.total ?? 0);
  },

  update(path: string, values: PhotoCreditValues) {
    return db
      .update(photoCredits)
      .set(values)
      .where(eq(photoCredits.path, path))
      .returning()
      .then((rows) => rows[0]);
  },

  /** Inserts a credit; returns undefined when the path already has one. */
  insert(values: typeof photoCredits.$inferInsert) {
    return db
      .insert(photoCredits)
      .values(values)
      .onConflictDoNothing({ target: photoCredits.path })
      .returning()
      .then((rows) => rows[0]);
  },

  /**
   * Uploaded images (under /media/) used by tours or destinations that have no
   * credit yet, so the admin can attribute them.
   */
  async uncreditedUploads(limit = 100): Promise<string[]> {
    const rows = await db.execute<{ path: string }>(sql`
      select distinct used.path from (
        select cover_image as path from tours
        union all select unnest(gallery) from tours
        union all select hero_image from destinations
      ) as used
      where used.path like '/media/%'
        and not exists (select 1 from ${photoCredits} c where c.path = used.path)
      order by used.path
      limit ${limit}`);
    return [...rows].map((row) => row.path);
  },
};

function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = likePattern(q);
  return or(
    ilike(photoCredits.path, pattern),
    ilike(photoCredits.title, pattern),
    ilike(photoCredits.author, pattern),
    ilike(photoCredits.license, pattern),
    ilike(photoCredits.source, pattern),
  );
}
