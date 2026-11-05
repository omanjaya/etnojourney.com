import "server-only";
import { and, asc, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, tours } from "@/server/db/schema";
import { ACTIVE_STATUSES } from "@/server/services/booking.rules";

/** Read-only queries behind the availability calendars (public and back office). */
export const availabilityRepository = {
  findTour(tourId: number) {
    return db.query.tours.findFirst({
      where: eq(tours.id, tourId),
      columns: { id: true, maxParticipants: true, isPublished: true, durationDays: true },
    });
  },

  /**
   * Active bookings per departure (tour + start date) whose trip overlaps
   * `[from, to]`, for one tour or for all tours (`null`): a three-day tour
   * that left two days before `from` is still on the road. Earliest first.
   */
  affectedDepartures(tourId: number | null, from: string, to: string) {
    return db
      .select({
        tourId: bookings.tourId,
        tourTitle: tours.title,
        date: bookings.travelDate,
        seats: sql<number>`coalesce(sum(${bookings.participants}), 0)::int`,
        bookings: count(),
      })
      .from(bookings)
      .innerJoin(tours, eq(tours.id, bookings.tourId))
      .where(
        and(
          tourId === null ? undefined : eq(bookings.tourId, tourId),
          lte(bookings.travelDate, to),
          sql`${bookings.travelDate} + (greatest(${tours.durationDays}, 1) - 1) >= ${from}::date`,
          inArray(bookings.status, [...ACTIVE_STATUSES]),
        ),
      )
      .groupBy(bookings.tourId, bookings.travelDate, tours.id)
      .orderBy(asc(bookings.travelDate), asc(tours.slug));
  },

  /** Seats held by active bookings per date in `[from, to]`, in one grouped query. */
  async seatsTakenByDate(tourId: number, from: string, to: string): Promise<Map<string, number>> {
    const rows = await db
      .select({
        date: bookings.travelDate,
        taken: sql<number>`coalesce(sum(${bookings.participants}), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tourId, tourId),
          gte(bookings.travelDate, from),
          lte(bookings.travelDate, to),
          inArray(bookings.status, [...ACTIVE_STATUSES]),
        ),
      )
      .groupBy(bookings.travelDate);
    return new Map(rows.map((row) => [row.date, row.taken]));
  },

  /**
   * Active bookings and seats per date in `[from, to]`, for one tour or for
   * all tours (`null`). Feeds the back-office calendar.
   */
  async loadByDate(
    tourId: number | null,
    from: string,
    to: string,
  ): Promise<Map<string, { seats: number; bookings: number }>> {
    const rows = await db
      .select({
        date: bookings.travelDate,
        seats: sql<number>`coalesce(sum(${bookings.participants}), 0)::int`,
        bookings: count(),
      })
      .from(bookings)
      .where(
        and(
          tourId === null ? undefined : eq(bookings.tourId, tourId),
          gte(bookings.travelDate, from),
          lte(bookings.travelDate, to),
          inArray(bookings.status, [...ACTIVE_STATUSES]),
        ),
      )
      .groupBy(bookings.travelDate);
    return new Map(rows.map((row) => [row.date, { seats: row.seats, bookings: row.bookings }]));
  },

  /** Every tour (published or not) for the back-office tour picker. */
  listTourOptions() {
    return db
      .select({
        id: tours.id,
        title: tours.title,
        maxParticipants: tours.maxParticipants,
        isPublished: tours.isPublished,
      })
      .from(tours)
      .orderBy(asc(tours.slug));
  },
};
