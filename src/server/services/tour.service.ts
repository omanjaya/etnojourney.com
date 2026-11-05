import "server-only";
import { paginate, type Paginated } from "@/lib/pagination";
import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import type { NewTour } from "@/server/db/schema";
import {
  tourRepository,
  type ItineraryInput,
  type TourFilters,
} from "@/server/repositories/tour.repository";
import { DomainError } from "./errors";
import { islandOf } from "@/lib/regions";

export type { TourFilters, TourSort } from "@/server/repositories/tour.repository";

export type TourListItem = Awaited<ReturnType<typeof tourRepository.searchPage>>[number];

export type TourInput = Omit<
  NewTour,
  "id" | "createdAt" | "updatedAt" | "rating" | "reviewCount"
> & {
  itinerary: ItineraryInput;
};

/** The pre-check covers the common case; the unique index catches concurrent saves. */
async function withSlugGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isUniqueViolation(error, "tours_slug_unique")) throw new DomainError("slugTaken");
    throw error;
  }
}

export const tourService = {
  search: (filters: TourFilters) => tourRepository.search(filters),

  /** Public `/tours` list: one page plus the total for the same filters. */
  searchPage(
    filters: TourFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<TourListItem>> {
    return paginate({
      page,
      pageSize,
      count: () => tourRepository.countSearch(filters),
      load: (limit, offset) => tourRepository.searchPage(filters, limit, offset),
    });
  },

  featured: (limit = 6) => tourRepository.findFeatured(limit),

  priceCeiling: () => tourRepository.findPriceCeiling(),

  /** Public detail page: unpublished tours are hidden. */
  async getPublishedBySlug(slug: string) {
    const tour = await tourRepository.findBySlug(slug);
    if (!tour || !tour.isPublished) throw new DomainError("notFound");
    return tour;
  },

  /** Up to `limit` tours closest to this one (destination, island, duration, category). */
  async related(tourId: number, destinationId: number, limit = 3) {
    const context = await tourRepository.findRelatedContext(tourId);
    if (!context) return [];
    const island = islandOf(context.province);
    return tourRepository.findRelated(
      {
        tourId,
        destinationId,
        island: island === "other" ? null : island,
        durationDays: context.durationDays,
        category: context.category,
      },
      limit,
    );
  },

  /* -------------------------- admin -------------------------- */

  /** Admin list: unpublished included, optional text search. */
  listForAdmin(query: string | undefined, page: number, pageSize: number) {
    const filters: TourFilters = { includeUnpublished: true, sort: "popular", query };
    return paginate({
      page,
      pageSize,
      count: () => tourRepository.countSearch(filters),
      load: (limit, offset) => tourRepository.searchPage(filters, limit, offset),
    });
  },

  async getForEdit(id: number) {
    const tour = await tourRepository.findById(id);
    if (!tour) throw new DomainError("notFound");
    return tour;
  },

  async create(input: TourInput) {
    if (await tourRepository.slugExists(input.slug)) throw new DomainError("slugTaken");
    const { itinerary, ...values } = input;
    return withSlugGuard(() =>
      db.transaction((tx) => tourRepository.createWithItinerary(tx, values, itinerary)),
    );
  },

  async update(id: number, input: TourInput) {
    if (await tourRepository.slugExists(input.slug, id)) throw new DomainError("slugTaken");
    const { itinerary, ...values } = input;
    const tour = await withSlugGuard(() =>
      db.transaction((tx) => tourRepository.updateWithItinerary(tx, id, values, itinerary)),
    );
    if (!tour) throw new DomainError("notFound");
    return tour;
  },

  async setPublished(id: number, isPublished: boolean) {
    const tour = await tourRepository.update(id, { isPublished });
    if (!tour) throw new DomainError("notFound");
    return tour;
  },

  async setFeatured(id: number, isFeatured: boolean) {
    const tour = await tourRepository.update(id, { isFeatured });
    if (!tour) throw new DomainError("notFound");
    return tour;
  },
};
