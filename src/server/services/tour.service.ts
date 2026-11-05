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
import { localize } from "@/lib/i18n-text";
import { auditService } from "./audit.service";
import {
  canViewTour,
  slugChangeBlocked,
  tourAuditDetails,
  tourChanges,
  tourRemovalBlocker,
  tourVersion,
  type TourRemovalBlocker,
} from "./catalogue.rules";
import { DomainError } from "./errors";
import { businessToday } from "./self-service.rules";
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

  /**
   * Detail page for whoever is looking: published tours for everyone, drafts
   * only for catalogue managers (preview). Everyone else gets notFound.
   */
  async getBySlugForViewer(slug: string, viewer: { role?: string | null } | null) {
    const tour = await tourRepository.findBySlug(slug);
    if (!tour || !canViewTour(tour.isPublished, viewer?.role)) throw new DomainError("notFound");
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

  /**
   * Admin list, newest first so a tour just created is on page 1. Unpublished
   * included unless `status` narrows it; optional text and destination filter.
   */
  listForAdmin(
    options: { query?: string; status?: "published" | "draft"; destinationSlug?: string },
    page: number,
    pageSize: number,
  ) {
    const filters: TourFilters = {
      includeUnpublished: options.status !== "published",
      draftsOnly: options.status === "draft",
      destinationSlug: options.destinationSlug,
      sort: "newest",
      query: options.query,
    };
    return paginate({
      page,
      pageSize,
      count: () => tourRepository.countSearch(filters),
      load: (limit, offset) => tourRepository.searchPage(filters, limit, offset),
    });
  },

  /** Pending or confirmed bookings from today (Asia/Jakarta) on, per tour id. */
  upcomingBookingCounts(tourIds: number[]) {
    return tourRepository.countUpcomingBookings(tourIds, businessToday());
  },

  /** The tour with its itinerary, plus the edit version the form sends back on save. */
  async getForEdit(id: number) {
    const tour = await tourRepository.findEditable(id);
    if (!tour) throw new DomainError("notFound");
    return { ...tour, version: tourVersion(tour) };
  },

  /** What would block deleting this tour right now (null when it can go). */
  async removalBlocker(tour: { id: number; isPublished: boolean }) {
    const usage = await tourRepository.countUsage(db, tour.id);
    return tourRemovalBlocker({ isPublished: tour.isPublished, ...usage });
  },

  async create(input: TourInput) {
    if (await tourRepository.slugExists(input.slug)) throw new DomainError("slugTaken");
    const { itinerary, ...values } = input;
    return withSlugGuard(() =>
      db.transaction((tx) => tourRepository.createWithItinerary(tx, values, itinerary)),
    );
  },

  /**
   * Saves the edit form. Runs under a row lock and refuses with `staleEdit`
   * when the tour changed since the form was opened (`expectedVersion`), and
   * with `slugLocked` when a live tour's address would change. Publish and
   * featured are never written here (they have their own switches). Nothing
   * is written or logged when nothing changed; otherwise the audit entry
   * names the changed fields and commits with the change.
   */
  async update(
    actorId: string,
    id: number,
    input: TourInput,
    expectedVersion: string,
  ): Promise<{ changed: boolean; version: string }> {
    if (await tourRepository.slugExists(input.slug, id)) throw new DomainError("slugTaken");
    const { itinerary, ...columns } = input;
    // Undefined columns are left untouched: publish and featured have their own switches.
    const values = { ...columns, isPublished: undefined, isFeatured: undefined };
    return withSlugGuard(() =>
      db.transaction(async (tx) => {
        const before = await tourRepository.findForUpdate(tx, id);
        if (!before) throw new DomainError("notFound");
        if (tourVersion(before) !== expectedVersion) throw new DomainError("staleEdit");
        if (slugChangeBlocked(before, values.slug)) throw new DomainError("slugLocked");

        const after = { ...values, itinerary };
        const fields = tourChanges(before, after);
        if (fields.length === 0) return { changed: false, version: expectedVersion };

        await tourRepository.updateWithItinerary(tx, id, values, itinerary);
        await auditService.record(
          {
            actorId,
            action: "tour.updated",
            entityType: "tour",
            entityId: id,
            details: tourAuditDetails(before, after, fields),
          },
          tx,
        );
        // Version of the row as stored, exactly as the next page load computes it.
        const stored = await tourRepository.findForUpdate(tx, id);
        return { changed: true, version: tourVersion(stored ?? after) };
      }),
    );
  },

  /**
   * Deletes an unpublished draft nobody booked or reviewed (see
   * `tourRemovalBlocker`); otherwise returns the reason and deletes nothing.
   */
  async remove(
    actorId: string,
    id: number,
  ): Promise<{ status: "deleted" } | { status: "blocked"; blocker: TourRemovalBlocker }> {
    return db.transaction(async (tx) => {
      const tour = await tourRepository.findForUpdate(tx, id);
      if (!tour) throw new DomainError("notFound");
      const usage = await tourRepository.countUsage(tx, id);
      const blocker = tourRemovalBlocker({ isPublished: tour.isPublished, ...usage });
      if (blocker) return { status: "blocked", blocker };
      await tourRepository.delete(tx, id);
      await auditService.record(
        {
          actorId,
          action: "tour.deleted",
          entityType: "tour",
          entityId: id,
          details: { slug: tour.slug, title: localize(tour.title, "id") },
        },
        tx,
      );
      return { status: "deleted" };
    });
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
