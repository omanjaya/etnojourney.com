import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, tours } from "@/server/db/schema";
import { ACTIVE_STATUSES } from "@/server/services/booking.rules";

/** Read-only queries behind the public availability calendar. */
export const availabilityRepository = {
  findTour(tourId: number) {
    return db.query.tours.findFirst({
      where: eq(tours.id, tourId),
      columns: { id: true, maxParticipants: true, isPublished: true },
    });
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
};
