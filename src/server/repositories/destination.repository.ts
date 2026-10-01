import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
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
  findAllForAdmin() {
    return db
      .select({
        destination: destinations,
        publishedTours: sql<number>`count(${tours.id}) filter (where ${tours.isPublished})::int`,
        totalTours: sql<number>`count(${tours.id})::int`,
      })
      .from(destinations)
      .leftJoin(tours, eq(tours.destinationId, destinations.id))
      .groupBy(destinations.id)
      .orderBy(asc(destinations.name));
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
