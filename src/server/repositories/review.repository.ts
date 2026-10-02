import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { bookings, destinations, reviewPhotos, reviews, tours } from "@/server/db/schema";

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

  /** Sets (or clears, with `reply: null`) the team's public reply. */
  setReply(
    id: number,
    values: { reply: string | null; repliedAt: Date | null; repliedBy: string | null },
  ) {
    return db
      .update(reviews)
      .set(values)
      .where(eq(reviews.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  async insertPhotos(
    tx: DbExecutor,
    reviewId: number,
    photos: { path: string; width: number; height: number; position: number }[],
  ): Promise<void> {
    if (photos.length === 0) return;
    await tx.insert(reviewPhotos).values(photos.map((photo) => ({ ...photo, reviewId })));
  },

  /** Visible photos of published reviews only: what the public may see. */
  publicPhotosForReviews(reviewIds: number[]) {
    if (reviewIds.length === 0) return Promise.resolve([]);
    return db
      .select({
        id: reviewPhotos.id,
        reviewId: reviewPhotos.reviewId,
        path: reviewPhotos.path,
        width: reviewPhotos.width,
        height: reviewPhotos.height,
      })
      .from(reviewPhotos)
      .innerJoin(reviews, eq(reviewPhotos.reviewId, reviews.id))
      .where(
        and(
          inArray(reviewPhotos.reviewId, reviewIds),
          eq(reviews.isPublished, true),
          eq(reviewPhotos.isHidden, false),
        ),
      )
      .orderBy(asc(reviewPhotos.reviewId), asc(reviewPhotos.position), asc(reviewPhotos.id));
  },

  /** Every photo of the given reviews, hidden ones included (moderation). */
  photosForReviews(reviewIds: number[]) {
    if (reviewIds.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(reviewPhotos)
      .where(inArray(reviewPhotos.reviewId, reviewIds))
      .orderBy(asc(reviewPhotos.reviewId), asc(reviewPhotos.position), asc(reviewPhotos.id));
  },

  findPhotoForUpdate(tx: DbExecutor, id: number) {
    return tx
      .select()
      .from(reviewPhotos)
      .where(eq(reviewPhotos.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  /** Whether `path` is a visible photo of a published review (what /media may serve publicly). */
  async isPhotoPublic(path: string): Promise<boolean> {
    const rows = await db
      .select({ id: reviewPhotos.id })
      .from(reviewPhotos)
      .innerJoin(reviews, eq(reviewPhotos.reviewId, reviews.id))
      .where(
        and(
          eq(reviewPhotos.path, path),
          eq(reviewPhotos.isHidden, false),
          eq(reviews.isPublished, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  /** Whether `path` belongs to any review (hidden or not): moderators may still view it. */
  async isPhotoAttached(path: string): Promise<boolean> {
    const rows = await db
      .select({ id: reviewPhotos.id })
      .from(reviewPhotos)
      .where(eq(reviewPhotos.path, path))
      .limit(1);
    return rows.length > 0;
  },

  setPhotoHidden(tx: DbExecutor, id: number, isHidden: boolean) {
    return tx
      .update(reviewPhotos)
      .set({ isHidden })
      .where(eq(reviewPhotos.id, id))
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

  /** Admin moderation list, filtered and paginated in SQL. */
  listAdmin(filters: AdminReviewFilters, limit: number, offset: number) {
    return db
      .select({
        review: reviews,
        tour: { id: tours.id, slug: tours.slug, title: tours.title },
      })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .where(adminReviewConditions(filters))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit)
      .offset(offset);
  },

  countAdmin(filters: AdminReviewFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .where(adminReviewConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },
};

export type AdminReviewFilters = {
  /** traveller = written via a booking; curated = imported; hidden = unpublished. */
  source?: "traveller" | "curated" | "hidden";
  q?: string;
};

function adminReviewConditions(filters: AdminReviewFilters): SQL | undefined {
  const traveller = or(isNotNull(reviews.userId), isNotNull(reviews.bookingId));
  const pattern = filters.q ? likePattern(filters.q) : undefined;
  return and(
    filters.source === "traveller" ? traveller : undefined,
    filters.source === "curated"
      ? and(isNull(reviews.userId), isNull(reviews.bookingId))
      : undefined,
    filters.source === "hidden" ? eq(reviews.isPublished, false) : undefined,
    pattern
      ? or(
          ilike(reviews.authorName, pattern),
          ilike(sql`${reviews.body}->>'id'`, pattern),
          ilike(sql`${reviews.body}->>'en'`, pattern),
          ilike(sql`${tours.title}->>'id'`, pattern),
          ilike(sql`${tours.title}->>'en'`, pattern),
        )
      : undefined,
  );
}
