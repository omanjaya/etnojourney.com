import "server-only";
import { paginate } from "@/lib/pagination";
import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import {
  destinationRepository,
  type NewDestination,
} from "@/server/repositories/destination.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { DomainError } from "./errors";

export type DestinationInput = Omit<NewDestination, "id" | "createdAt" | "updatedAt">;

/** Maps a lost race on the unique slug to a domain error. */
async function withSlugGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isUniqueViolation(error, "destinations_slug_unique")) throw new DomainError("slugTaken");
    throw error;
  }
}

export const destinationService = {
  listWithTourCount: () => destinationRepository.findAllWithTourCount(),

  list: () => destinationRepository.findAll(),

  async getWithTours(slug: string) {
    const destination = await destinationRepository.findBySlug(slug);
    if (!destination) throw new DomainError("notFound");
    const tours = await tourRepository.search({ destinationSlug: slug });
    return { destination, tours };
  },

  /* -------------------------- admin -------------------------- */

  listForAdmin(query: string | undefined, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => destinationRepository.countForAdmin(query),
      load: (limit, offset) => destinationRepository.findPageForAdmin(query, limit, offset),
    });
  },

  /** Tours (published or not) still attached; deletion is blocked while > 0. */
  tourCount: (id: number) => destinationRepository.countTours(db, id),

  async getForEdit(id: number) {
    const destination = await destinationRepository.findById(id);
    if (!destination) throw new DomainError("notFound");
    return destination;
  },

  async isSlugAvailable(slug: string, excludeId?: number) {
    return !(await destinationRepository.slugExists(slug, excludeId));
  },

  async create(input: DestinationInput) {
    if (await destinationRepository.slugExists(input.slug)) throw new DomainError("slugTaken");
    return withSlugGuard(() => destinationRepository.insert(input));
  },

  async update(id: number, input: DestinationInput) {
    if (await destinationRepository.slugExists(input.slug, id)) {
      throw new DomainError("slugTaken");
    }
    const destination = await withSlugGuard(() => destinationRepository.update(id, input));
    if (!destination) throw new DomainError("notFound");
    return destination;
  },

  /**
   * Deletes a destination that has no tours. Returns `"inUse"` instead of
   * deleting when any tour (published or not) still references it.
   */
  async remove(id: number): Promise<"deleted" | "inUse"> {
    return db.transaction(async (tx) => {
      const locked = await destinationRepository.lockById(tx, id);
      if (!locked) throw new DomainError("notFound");
      if ((await destinationRepository.countTours(tx, id)) > 0) return "inUse";
      await destinationRepository.delete(tx, id);
      return "deleted";
    });
  },
};
