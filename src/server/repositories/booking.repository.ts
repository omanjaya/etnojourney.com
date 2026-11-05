import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
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
  type PaymentStatus,
} from "@/server/db/schema";
import { ACTIVE_STATUSES, phoneSearchDigits } from "@/server/services/booking.rules";

export type AdminBookingSort = "created" | "travel";

export type AdminBookingFilters = {
  /**
   * Matches booking code, customer name or email, contact name, tour title, or
   * (when it looks like a phone number) the contact phone in any format.
   */
  q?: string;
  status?: BookingStatus;
  /** Travel date range, inclusive, YYYY-MM-DD. */
  from?: string;
  to?: string;
  sort?: AdminBookingSort;
};

/** Digits of the contact phone without a leading "0" or "62" (see `phoneSearchDigits`). */
const phoneDigits = sql`regexp_replace(regexp_replace(${bookings.contactPhone}, '[^0-9]', '', 'g'), '^(62|0)', '')`;

/** Callers must join `tours` and `user`: the search covers both. */
function adminConditions(filters: AdminBookingFilters): SQL | undefined {
  const pattern = filters.q ? likePattern(filters.q) : undefined;
  const phone = filters.q ? phoneSearchDigits(filters.q) : null;
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
          sql`${tours.title}->>'id' ilike ${pattern}`,
          sql`${tours.title}->>'en' ilike ${pattern}`,
          phone ? sql`${phoneDigits} like ${`%${phone}%`}` : undefined,
        )
      : undefined,
  );
}

function adminOrder(sort: AdminBookingSort | undefined): SQL[] {
  return sort === "travel"
    ? [asc(bookings.travelDate), desc(bookings.id)]
    : [desc(bookings.createdAt), desc(bookings.id)];
}

/**
 * The outer booking's id for correlated subqueries, always table-qualified:
 * in a single-table select Drizzle renders `bookings.id` as a bare "id",
 * which inside a subquery on payments would bind to `payments.id`.
 */
const outerBookingId = sql`${bookings}.${sql.identifier("id")}`;

/** Paid attempt first, otherwise the most recent one. */
const latestPaymentStatus = sql<PaymentStatus | null>`(
  select ${payments.status} from ${payments}
  where ${payments.bookingId} = ${outerBookingId}
  order by (${payments.status} = 'paid') desc, ${payments.createdAt} desc
  limit 1
)`;

/** Money taken and not yet flagged for a refund (0 when unpaid). */
const livePaidAmount = sql<number>`(
  select coalesce(sum(${payments.amount}), 0)::int from ${payments}
  where ${payments.bookingId} = ${outerBookingId}
    and ${payments.status} = 'paid' and not ${payments.refundRequired}
)`.mapWith(Number);

/** What the admin booking lists show for each booking. */
const adminListRow = {
  booking: bookings,
  tour: { id: tours.id, slug: tours.slug, title: tours.title },
  customer: { id: user.id, name: user.name, email: user.email },
  paymentStatus: latestPaymentStatus,
  paidAmount: livePaidAmount,
};

/** Payment state that decides whether a pending booking still holds its seats. */
const holdColumns = {
  id: bookings.id,
  status: bookings.status,
  travelDate: bookings.travelDate,
  createdAt: bookings.createdAt,
  hasPaid: sql<boolean>`exists(
    select 1 from ${payments}
    where ${payments.bookingId} = ${outerBookingId} and ${payments.status} = 'paid'
  )`,
  pendingPaymentAt: sql<Date | null>`(
    select max(${payments.createdAt}) from ${payments}
    where ${payments.bookingId} = ${outerBookingId} and ${payments.status} = 'pending'
  )`.mapWith(payments.createdAt),
};

/** Where the next export batch starts: after the last row of the previous one. */
export type ExportCursor = { id: number; travelDate: string };

/** Keyset continuation matching the export order for `sort`. */
function exportAfter(sort: AdminBookingSort | undefined, after: ExportCursor): SQL | undefined {
  if (sort !== "travel") return lt(bookings.id, after.id);
  return or(
    gt(bookings.travelDate, after.travelDate),
    and(eq(bookings.travelDate, after.travelDate), lt(bookings.id, after.id)),
  );
}

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

  /**
   * Seats held on a date by every active booking except `bookingId` (the one
   * being moved). Callers must hold the tour row lock, as for `countActiveSeats`.
   */
  async countActiveSeatsExcluding(
    tx: DbExecutor,
    tourId: number,
    travelDate: string,
    bookingId: number,
  ): Promise<number> {
    const rows = await tx
      .select({ participants: bookings.participants })
      .from(bookings)
      .where(
        and(
          eq(bookings.tourId, tourId),
          eq(bookings.travelDate, travelDate),
          inArray(bookings.status, [...ACTIVE_STATUSES]),
          ne(bookings.id, bookingId),
        ),
      );
    return rows.reduce((total, row) => total + row.participants, 0);
  },

  /**
   * Moves a booking to a new date: bumps the reschedule count and clears the
   * pre-trip reminder marker so the reminder goes out again for the new date.
   */
  reschedule(tx: DbExecutor, id: number, travelDate: string): Promise<Booking> {
    return tx
      .update(bookings)
      .set({
        travelDate,
        rescheduleCount: sql`${bookings.rescheduleCount} + 1`,
        reminderSentAt: null,
      })
      .where(eq(bookings.id, id))
      .returning()
      .then((rows) => rows[0]);
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
      .select(adminListRow)
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(status ? eq(bookings.status, status) : undefined)
      .orderBy(desc(bookings.createdAt));
  },

  /** Admin list page: one page of bookings matching the filters. */
  listAdmin(filters: AdminBookingFilters, limit: number, offset: number) {
    return db
      .select(adminListRow)
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
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(adminConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },

  /**
   * Flat rows for CSV export, one keyset-paginated batch at a time: newest
   * first, or by travel date for `sort: "travel"` (as on the admin list).
   * Unlike OFFSET, each batch seeks straight past the previous one, so exports
   * stay linear and rows can't shift between batches when bookings arrive.
   */
  exportBatch(filters: AdminBookingFilters, limit: number, after?: ExportCursor) {
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
      .where(and(adminConditions(filters), after ? exportAfter(filters.sort, after) : undefined))
      .orderBy(
        ...(filters.sort === "travel"
          ? [asc(bookings.travelDate), desc(bookings.id)]
          : [desc(bookings.id)]),
      )
      .limit(limit);
  },

  /** Admin booking detail: the booking with its tour and the account that made it. */
  findAdminDetailByCode(code: string) {
    return db
      .select({
        booking: bookings,
        tour: { id: tours.id, slug: tours.slug, title: tours.title },
        customer: { id: user.id, name: user.name, email: user.email },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(eq(bookings.code, code))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /** Every payment attempt for a booking, newest first. */
  listPayments(bookingId: number) {
    return db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt), desc(payments.id));
  },

  /**
   * Pending bookings that may have to give their seats back (created before
   * `createdBefore`, or travelling before `today`), oldest first, with the
   * payment state `isStaleHold` needs.
   */
  listHoldCandidates(createdBefore: Date, today: string, limit: number) {
    return db
      .select(holdColumns)
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "pending"),
          or(lte(bookings.createdAt, createdBefore), lt(bookings.travelDate, today)),
        ),
      )
      .orderBy(asc(bookings.id))
      .limit(limit);
  },

  /** The same hold state for one booking, read inside the caller's transaction. */
  holdState(tx: DbExecutor, id: number) {
    return tx
      .select(holdColumns)
      .from(bookings)
      .where(eq(bookings.id, id))
      .then((rows) => rows[0]);
  },

  async stats() {
    const byStatus = await db
      .select({ status: bookings.status, total: count() })
      .from(bookings)
      .groupBy(bookings.status);
    const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.total])) as Partial<
      Record<BookingStatus, number>
    >;
    return { counts };
  },
};
