import "server-only";
import { and, asc, count, desc, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import {
  destinations,
  itineraryDays,
  tours,
  type NewTour,
  type Tour,
  type TourCategory,
} from "@/server/db/schema";
import type { LocalizedText } from "@/lib/i18n-text";

export type ItineraryInput = { title: LocalizedText; description: LocalizedText }[];

export type TourSort = "popular" | "priceAsc" | "priceDesc" | "duration";

export type TourFilters = {
  query?: string;
  category?: TourCategory;
  destinationSlug?: string;
  maxPrice?: number;
  maxDays?: number;
  sort?: TourSort;
  includeUnpublished?: boolean;
};

const orderings: Record<TourSort, SQL[]> = {
  popular: [desc(tours.isFeatured), desc(tours.rating), desc(tours.reviewCount)],
  priceAsc: [asc(tours.pricePerPerson)],
  priceDesc: [desc(tours.pricePerPerson)],
  duration: [asc(tours.durationDays)],
};

function searchConditions(filters: TourFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    filters.includeUnpublished ? undefined : eq(tours.isPublished, true),
    filters.category ? eq(tours.category, filters.category) : undefined,
    filters.destinationSlug ? eq(destinations.slug, filters.destinationSlug) : undefined,
    filters.maxPrice ? lte(tours.pricePerPerson, filters.maxPrice) : undefined,
    filters.maxDays ? lte(tours.durationDays, filters.maxDays) : undefined,
  ];

  if (filters.query) {
    const pattern = likePattern(filters.query);
    conditions.push(
      or(
        ilike(sql`${tours.title}->>'id'`, pattern),
        ilike(sql`${tours.title}->>'en'`, pattern),
        ilike(destinations.name, pattern),
        ilike(tours.slug, pattern),
      ),
    );
  }
  return and(...conditions);
}

export const tourRepository = {
  /** All matching tours (sitemap, destination pages). Prefer `searchPage` for lists. */
  search(filters: TourFilters = {}) {
    return db
      .select({ tour: tours, destination: destinations })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(searchConditions(filters))
      .orderBy(...orderings[filters.sort ?? "popular"]);
  },

  /** One page of matching tours. `tours.id` breaks ties so pages never overlap. */
  searchPage(filters: TourFilters, limit: number, offset: number) {
    return db
      .select({ tour: tours, destination: destinations })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(searchConditions(filters))
      .orderBy(...orderings[filters.sort ?? "popular"], asc(tours.id))
      .limit(limit)
      .offset(offset);
  },

  countSearch(filters: TourFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(searchConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },

  findFeatured(limit: number) {
    return db
      .select({ tour: tours, destination: destinations })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(and(eq(tours.isPublished, true), eq(tours.isFeatured, true)))
      .orderBy(desc(tours.rating))
      .limit(limit);
  },

  findBySlug(slug: string) {
    return db.query.tours.findFirst({
      where: eq(tours.slug, slug),
      with: {
        destination: true,
        itinerary: { orderBy: (d, { asc }) => [asc(d.day)] },
        reviews: {
          where: (r, { eq }) => eq(r.isPublished, true),
          orderBy: (r, { desc }) => [desc(r.createdAt)],
          limit: 6,
        },
      },
    });
  },

  findById(id: number) {
    return db.query.tours.findFirst({
      where: eq(tours.id, id),
      with: { itinerary: { orderBy: (d, { asc }) => [asc(d.day)] } },
    });
  },

  /**
   * Other published tours, preferring the same destination and then the same
   * category elsewhere, so the "related" row stays full on small destinations.
   */
  findRelated(tourId: number, destinationId: number, limit: number) {
    const sameCategory = sql`${tours.category} = (select t.category from ${tours} t where t.id = ${tourId})`;
    return db
      .select({ tour: tours, destination: destinations })
      .from(tours)
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(
        and(
          eq(tours.isPublished, true),
          sql`${tours.id} <> ${tourId}`,
          or(eq(tours.destinationId, destinationId), sameCategory),
        ),
      )
      .orderBy(desc(sql`${tours.destinationId} = ${destinationId}`), desc(tours.rating))
      .limit(limit);
  },

  findPriceCeiling() {
    return db
      .select({ max: sql<number>`coalesce(max(${tours.pricePerPerson}), 0)::int` })
      .from(tours)
      .where(eq(tours.isPublished, true))
      .then((rows) => rows[0]?.max ?? 0);
  },

  slugExists(slug: string, excludeId?: number) {
    return db
      .select({ id: tours.id })
      .from(tours)
      .where(and(eq(tours.slug, slug), excludeId ? sql`${tours.id} <> ${excludeId}` : undefined))
      .limit(1)
      .then((rows) => rows.length > 0);
  },

  /** Locks the tour row so concurrent bookings for it are serialised. */
  lockById(tx: DbExecutor, id: number): Promise<{ id: number } | undefined> {
    return tx
      .select({ id: tours.id })
      .from(tours)
      .where(eq(tours.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  async createWithItinerary(
    tx: DbExecutor,
    values: NewTour,
    itinerary: ItineraryInput,
  ): Promise<Tour> {
    const [tour] = await tx.insert(tours).values(values).returning();
    await insertItinerary(tx, tour.id, itinerary);
    return tour;
  },

  /** Replaces the tour's fields and its whole itinerary. Returns undefined when missing. */
  async updateWithItinerary(
    tx: DbExecutor,
    id: number,
    values: Partial<NewTour>,
    itinerary: ItineraryInput,
  ): Promise<Tour | undefined> {
    const [tour] = await tx.update(tours).set(values).where(eq(tours.id, id)).returning();
    if (!tour) return undefined;
    await tx.delete(itineraryDays).where(eq(itineraryDays.tourId, id));
    await insertItinerary(tx, id, itinerary);
    return tour;
  },

  update(id: number, values: Partial<NewTour>) {
    return db
      .update(tours)
      .set(values)
      .where(eq(tours.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  countPublished() {
    return db.$count(tours, eq(tours.isPublished, true));
  },
};

async function insertItinerary(tx: DbExecutor, tourId: number, itinerary: ItineraryInput) {
  if (itinerary.length === 0) return;
  await tx
    .insert(itineraryDays)
    .values(itinerary.map((day, i) => ({ ...day, tourId, day: i + 1 })));
}
