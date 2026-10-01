import "server-only";
import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import {
  bookings,
  destinations,
  tours,
  user,
  type Booking,
  type BookingStatus,
} from "@/server/db/schema";
import { ACTIVE_STATUSES } from "@/server/services/booking.rules";

export const bookingRepository = {
  /**
   * Seats already held on a date. Callers must hold the tour row lock
   * (`tourRepository.lockById`) so concurrent bookings see each other's inserts.
   */
  async countActiveSeats(tx: DbExecutor, tourId: number, travelDate: string): Promise<number> {
    const rows = await tx
      .select({ participants: bookings.participants })
      .from(bookings)
      .where(
        and(
          eq(bookings.tourId, tourId),
          eq(bookings.travelDate, travelDate),
          inArray(bookings.status, [...ACTIVE_STATUSES]),
        ),
      );
    return rows.reduce((total, row) => total + row.participants, 0);
  },

  insert(tx: DbExecutor, values: typeof bookings.$inferInsert): Promise<Booking> {
    return tx
      .insert(bookings)
      .values(values)
      .returning()
      .then((rows) => rows[0]);
  },

  findById(id: number) {
    return db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  },

  /** Booking with its tour and owner, used to start a payment. */
  findWithTourAndUser(id: number, tx: DbExecutor = db) {
    return tx.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        tour: { columns: { id: true, title: true } },
        user: { columns: { name: true, email: true } },
      },
    });
  },

  /** Locks the booking row inside a transaction before changing its status. */
  findByIdForUpdate(tx: DbExecutor, id: number): Promise<Booking | undefined> {
    return tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  updateStatusWith(tx: DbExecutor, id: number, status: BookingStatus) {
    return tx
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  findByCode(code: string) {
    return db.query.bookings.findFirst({ where: eq(bookings.code, code) });
  },

  listForUser(userId: string) {
    return db
      .select({ booking: bookings, tour: tours, destination: destinations })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  },

  listAll(status?: BookingStatus) {
    return db
      .select({
        booking: bookings,
        tour: { id: tours.id, slug: tours.slug, title: tours.title },
        customer: { id: user.id, name: user.name, email: user.email },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(status ? eq(bookings.status, status) : undefined)
      .orderBy(desc(bookings.createdAt));
  },

  async stats() {
    const [byStatus, revenue] = await Promise.all([
      db
        .select({ status: bookings.status, total: count() })
        .from(bookings)
        .groupBy(bookings.status),
      db
        .select({ value: sql<number>`coalesce(${sum(bookings.totalPrice)}, 0)::bigint` })
        .from(bookings)
        .where(inArray(bookings.status, ["confirmed", "completed"])),
    ]);
    const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.total])) as Partial<
      Record<BookingStatus, number>
    >;
    return { counts, revenue: Number(revenue[0]?.value ?? 0) };
  },
};
