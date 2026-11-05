import "server-only";
import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { destinations, tours } from "@/server/db/schema";

export type NewDestination = typeof destinations.$inferInsert;

export const destinationRepository = {
  findAllWithTourCount() {
    return (
      db
        .select({
          destination: destinations,
          tourCount: count(tours.id),
        })
        .from(destinations)
        // Count only published tours so the card matches the destination page.
        .leftJoin(tours, and(eq(tours.destinationId, destinations.id), eq(tours.isPublished, true)))
        .groupBy(destinations.id)
        .orderBy(asc(destinations.name))
    );
  },

  /** Admin list: published and total tour counts (total decides whether delete is allowed). */
  /** Admin list page with tour counts; optional text search, paginated. */
  findPageForAdmin(query: string | undefined, limit: number, offset: number) {
    return db
      .select({
        destination: destinations,
        publishedTours: sql<number>`count(${tours.id}) filter (where ${tours.isPublished})::int`,
        totalTours: sql<number>`count(${tours.id})::int`,
      })
      .from(destinations)
      .leftJoin(tours, eq(tours.destinationId, destinations.id))
      .where(adminSearch(query))
      .groupBy(destinations.id)
      .orderBy(asc(destinations.name), asc(destinations.id))
      .limit(limit)
      .offset(offset);
  },

  countForAdmin(query: string | undefined): Promise<number> {
    return db
      .select({ total: count() })
      .from(destinations)
      .where(adminSearch(query))
      .then((rows) => rows[0]?.total ?? 0);
  },

  findAll() {
    return db.query.destinations.findMany({ orderBy: asc(destinations.name) });
  },

  findBySlug(slug: string) {
    return db.query.destinations.findFirst({ where: eq(destinations.slug, slug) });
  },

  findById(id: number) {
    return db.query.destinations.findFirst({ where: eq(destinations.id, id) });
  },

  slugExists(slug: string, excludeId?: number) {
    return db
      .select({ id: destinations.id })
      .from(destinations)
      .where(
        and(
          eq(destinations.slug, slug),
          excludeId ? sql`${destinations.id} <> ${excludeId}` : undefined,
        ),
      )
      .limit(1)
      .then((rows) => rows.length > 0);
  },

  insert(values: NewDestination) {
    return db
      .insert(destinations)
      .values(values)
      .returning()
      .then((rows) => rows[0]);
  },

  update(id: number, values: Partial<NewDestination>) {
    return db
      .update(destinations)
      .set(values)
      .where(eq(destinations.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  /** Locks the destination row so a concurrent tour insert can't race a delete. */
  lockById(tx: DbExecutor, id: number) {
    return tx
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  countTours(tx: DbExecutor, id: number) {
    return tx
      .select({ total: count() })
      .from(tours)
      .where(eq(tours.destinationId, id))
      .then((rows) => rows[0]?.total ?? 0);
  },

  delete(tx: DbExecutor, id: number) {
    return tx.delete(destinations).where(eq(destinations.id, id));
  },
};

function adminSearch(query: string | undefined): SQL | undefined {
  if (!query) return undefined;
  const pattern = likePattern(query);
  return or(
    ilike(destinations.name, pattern),
    ilike(destinations.province, pattern),
    ilike(destinations.slug, pattern),
  );
}
