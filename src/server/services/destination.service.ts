import "server-only";
import { paginate } from "@/lib/pagination";
import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import {
  destinationRepository,
  type NewDestination,
} from "@/server/repositories/destination.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { auditService } from "./audit.service";
import { destinationAuditDetails, destinationChanges, destinationVersion } from "./catalogue.rules";
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

  /** The destination plus the edit version the form sends back on save. */
  async getForEdit(id: number) {
    const destination = await destinationRepository.findEditable(id);
    if (!destination) throw new DomainError("notFound");
    return { ...destination, version: destinationVersion(destination) };
  },

  async isSlugAvailable(slug: string, excludeId?: number) {
    return !(await destinationRepository.slugExists(slug, excludeId));
  },

  async create(input: DestinationInput) {
    if (await destinationRepository.slugExists(input.slug)) throw new DomainError("slugTaken");
    return withSlugGuard(() => destinationRepository.insert(input));
  },

  /**
   * Saves the edit form under a row lock. Refuses with `staleEdit` when the
   * destination changed since the form was opened (`expectedVersion`). Writes
   * and logs nothing when nothing changed; otherwise the audit entry names the
   * changed fields and commits with the change.
   */
  async update(
    actorId: string,
    id: number,
    input: DestinationInput,
    expectedVersion: string,
  ): Promise<{ changed: boolean; version: string }> {
    if (await destinationRepository.slugExists(input.slug, id)) {
      throw new DomainError("slugTaken");
    }
    return withSlugGuard(() =>
      db.transaction(async (tx) => {
        const before = await destinationRepository.findForUpdate(tx, id);
        if (!before) throw new DomainError("notFound");
        if (destinationVersion(before) !== expectedVersion) throw new DomainError("staleEdit");

        const fields = destinationChanges(before, input);
        if (fields.length === 0) return { changed: false, version: expectedVersion };

        const stored = await destinationRepository.update(id, input, tx);
        await auditService.record(
          {
            actorId,
            action: "destination.updated",
            entityType: "destination",
            entityId: id,
            details: destinationAuditDetails(before, input, fields),
          },
          tx,
        );
        // Version of the row as stored, exactly as the next page load computes it.
        return { changed: true, version: destinationVersion(stored ?? input) };
      }),
    );
  },

  /**
   * Deletes a destination that has no tours. Returns `"inUse"` instead of
   * deleting when any tour (published or not) still references it. The audit
   * entry keeps the slug and name, since the row itself is gone afterwards.
   */
  async remove(actorId: string, id: number): Promise<"deleted" | "inUse"> {
    return db.transaction(async (tx) => {
      const locked = await destinationRepository.lockById(tx, id);
      if (!locked) throw new DomainError("notFound");
      if ((await destinationRepository.countTours(tx, id)) > 0) return "inUse";
      await destinationRepository.delete(tx, id);
      await auditService.record(
        {
          actorId,
          action: "destination.deleted",
          entityType: "destination",
          entityId: id,
          details: { slug: locked.slug, name: locked.name },
        },
        tx,
      );
      return "deleted";
    });
  },
};
