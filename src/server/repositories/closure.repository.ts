import "server-only";
import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { tourClosures, tours, user } from "@/server/db/schema";

const closureColumns = {
  id: tourClosures.id,
  tourId: tourClosures.tourId,
  date: tourClosures.date,
  reason: tourClosures.reason,
  createdBy: tourClosures.createdBy,
};

/** Closures that apply to `tourId`: its own and those for all tours. */
const appliesTo = (tourId: number) =>
  or(eq(tourClosures.tourId, tourId), isNull(tourClosures.tourId));

/** Dates an admin closed for booking (`tour_closures`). */
export const closureRepository = {
  /** Whether `tourId` is closed on `date` (for that tour or for all tours). */
  async isClosed(tourId: number, date: string, executor: DbExecutor = db): Promise<boolean> {
    const rows = await executor
      .select({ id: tourClosures.id })
      .from(tourClosures)
      .where(and(eq(tourClosures.date, date), appliesTo(tourId)))
      .limit(1);
    return rows.length > 0;
  },

  /** Dates in `[from, to]` on which `tourId` is closed. */
  async closedDatesForTour(tourId: number, from: string, to: string): Promise<Set<string>> {
    const rows = await db
      .selectDistinct({ date: tourClosures.date })
      .from(tourClosures)
      .where(and(appliesTo(tourId), gte(tourClosures.date, from), lte(tourClosures.date, to)));
    return new Set(rows.map((row) => row.date));
  },

  /**
   * Closures in `[from, to]` relevant to a back-office view: for one tour its
   * own and all-tours closures; for all tours (`null`) every closure.
   */
  listInRange(tourId: number | null, from: string, to: string) {
    return db
      .select(closureColumns)
      .from(tourClosures)
      .where(
        and(
          tourId === null ? undefined : appliesTo(tourId),
          gte(tourClosures.date, from),
          lte(tourClosures.date, to),
        ),
      )
      .orderBy(asc(tourClosures.date), asc(tourClosures.id));
  },

  /** Dates in `[from, to]` already closed for exactly this scope. */
  async datesClosedForScope(tourId: number | null, from: string, to: string): Promise<string[]> {
    const rows = await db
      .select({ date: tourClosures.date })
      .from(tourClosures)
      .where(
        and(
          tourId === null ? isNull(tourClosures.tourId) : eq(tourClosures.tourId, tourId),
          gte(tourClosures.date, from),
          lte(tourClosures.date, to),
        ),
      );
    return rows.map((row) => row.date);
  },

  /** Inserts closures, skipping dates already closed for the same scope. */
  insertMany(
    executor: DbExecutor,
    values: { tourId: number | null; date: string; reason: string | null; createdBy: string }[],
  ) {
    if (values.length === 0) return Promise.resolve([]);
    return executor
      .insert(tourClosures)
      .values(values)
      .onConflictDoNothing()
      .returning(closureColumns);
  },

  deleteByIds(executor: DbExecutor, ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return executor
      .delete(tourClosures)
      .where(inArray(tourClosures.id, ids))
      .returning(closureColumns);
  },

  /** Closures from `from` onwards with the tour title and author name. */
  listUpcoming(from: string, limit: number) {
    return db
      .select({
        ...closureColumns,
        tourTitle: tours.title,
        tourSlug: tours.slug,
        createdByName: user.name,
      })
      .from(tourClosures)
      .leftJoin(tours, eq(tours.id, tourClosures.tourId))
      .leftJoin(user, eq(user.id, tourClosures.createdBy))
      .where(gte(tourClosures.date, from))
      .orderBy(asc(tourClosures.date), asc(tourClosures.id))
      .limit(limit);
  },
};
