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
  lt,
  lte,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import {
  bookings,
  destinations,
  payments,
  tours,
  user,
  type Booking,
  type BookingStatus,
} from "@/server/db/schema";
import { ACTIVE_STATUSES } from "@/server/services/booking.rules";

export type AdminBookingSort = "created" | "travel";

export type AdminBookingFilters = {
  /** Matches booking code, customer name or customer email. */
  q?: string;
  status?: BookingStatus;
  /** Travel date range, inclusive, YYYY-MM-DD. */
  from?: string;
  to?: string;
  sort?: AdminBookingSort;
};

function adminConditions(filters: AdminBookingFilters): SQL | undefined {
  const pattern = filters.q ? likePattern(filters.q) : undefined;
  return and(
    filters.status ? eq(bookings.status, filters.status) : undefined,
    filters.from ? gte(bookings.travelDate, filters.from) : undefined,
    filters.to ? lte(bookings.travelDate, filters.to) : undefined,
    pattern
      ? or(
          ilike(bookings.code, pattern),
          ilike(user.name, pattern),
          ilike(user.email, pattern),
          ilike(bookings.contactName, pattern),
        )
      : undefined,
  );
}

function adminOrder(sort: AdminBookingSort | undefined): SQL[] {
  return sort === "travel"
    ? [asc(bookings.travelDate), desc(bookings.id)]
    : [desc(bookings.createdAt), desc(bookings.id)];
}

/** Paid attempt first, otherwise the most recent one. */
const latestPaymentStatus = sql<string | null>`(
  select ${payments.status} from ${payments}
  where ${payments.bookingId} = ${bookings.id}
  order by (${payments.status} = 'paid') desc, ${payments.createdAt} desc
  limit 1
)`;

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

  /** Admin list page: one page of bookings matching the filters. */
  listAdmin(filters: AdminBookingFilters, limit: number, offset: number) {
    return db
      .select({
        booking: bookings,
        tour: { id: tours.id, slug: tours.slug, title: tours.title },
        customer: { id: user.id, name: user.name, email: user.email },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(adminConditions(filters))
      .orderBy(...adminOrder(filters.sort))
      .limit(limit)
      .offset(offset);
  },

  countAdmin(filters: AdminBookingFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(bookings)
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(adminConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },

  /** Flat rows for CSV export, read in batches by the caller. */
  /**
   * Keyset-paginated export batch (newest id first). Unlike OFFSET, each batch
   * seeks straight past the previous one, so exports stay linear and rows
   * can't shift between batches when new bookings arrive mid-export.
   */
  exportBatch(filters: AdminBookingFilters, limit: number, beforeId?: number) {
    return db
      .select({
        code: bookings.code,
        status: bookings.status,
        paymentStatus: latestPaymentStatus,
        customerName: user.name,
        customerEmail: user.email,
        contactName: bookings.contactName,
        contactPhone: bookings.contactPhone,
        tourTitle: tours.title,
        travelDate: bookings.travelDate,
        participants: bookings.participants,
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt,
        id: bookings.id,
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(
        and(adminConditions(filters), beforeId === undefined ? undefined : lt(bookings.id, beforeId)),
      )
      .orderBy(desc(bookings.id))
      .limit(limit);
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
