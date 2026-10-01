import "server-only";
import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { bookings, destinations, reviews, tours } from "@/server/db/schema";

export const reviewRepository = {
  latestHighlights(limit: number) {
    return db
      .select({
        review: reviews,
        tour: { slug: tours.slug, title: tours.title },
        destination: destinations.name,
      })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(
        and(gte(reviews.rating, 5), eq(reviews.isPublished, true), eq(tours.isPublished, true)),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  },

  /** Catalogue-wide figures from published tours: tour count, review count and weighted rating. */
  summary() {
    return db
      .select({
        tours: count(),
        total: sql<number>`coalesce(sum(${tours.reviewCount}), 0)::int`,
        average: sql<number>`coalesce(sum(${tours.rating} * ${tours.reviewCount}) / nullif(sum(${tours.reviewCount}), 0), 0)::float`,
      })
      .from(tours)
      .where(eq(tours.isPublished, true))
      .then((rows) => ({
        tours: rows[0]?.tours ?? 0,
        total: rows[0]?.total ?? 0,
        average: Number(rows[0]?.average ?? 0),
      }));
  },

  findBookingForReview(bookingId: number) {
    return db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      columns: { id: true, userId: true, tourId: true, status: true },
    });
  },

  async existsForBooking(tx: DbExecutor, bookingId: number): Promise<boolean> {
    const rows = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId))
      .limit(1);
    return rows.length > 0;
  },

  reviewedBookingIds(userId: string) {
    return db
      .select({ bookingId: reviews.bookingId })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), isNotNull(reviews.bookingId)))
      .then((rows) => new Set(rows.map((r) => r.bookingId as number)));
  },

  insert(tx: DbExecutor, values: typeof reviews.$inferInsert) {
    return tx
      .insert(reviews)
      .values(values)
      .returning()
      .then((rows) => rows[0]);
  },

  findById(tx: DbExecutor, id: number) {
    return tx
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1)
      .then((rows) => rows[0]);
  },

  setPublished(tx: DbExecutor, id: number, isPublished: boolean) {
    return tx
      .update(reviews)
      .set({ isPublished })
      .where(eq(reviews.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  /** Reads a tour's aggregate and locks the row for the rest of the transaction. */
  lockTourAggregate(tx: DbExecutor, tourId: number) {
    return tx
      .select({ rating: tours.rating, count: tours.reviewCount, slug: tours.slug })
      .from(tours)
      .where(eq(tours.id, tourId))
      .for("update")
      .then((rows) => rows[0]);
  },

  async updateTourAggregate(tx: DbExecutor, tourId: number, rating: number, count: number) {
    await tx.update(tours).set({ rating, reviewCount: count }).where(eq(tours.id, tourId));
  },

  listAll() {
    return db
      .select({
        review: reviews,
        tour: { id: tours.id, slug: tours.slug, title: tours.title },
      })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .orderBy(desc(reviews.createdAt));
  },
};
