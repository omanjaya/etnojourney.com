import "server-only";
import { and, count, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, payments, tours, type BookingStatus } from "@/server/db/schema";

/**
 * Aggregates for the admin reports. Every query takes a half-open instant range
 * `[start, end)` and groups in SQL; months are bucketed in Asia/Jakarta.
 */
type Range = { start: Date; end: Date };

const monthOf = (column: SQL | typeof payments.paidAt | typeof bookings.createdAt) =>
  sql<string>`to_char(${column} at time zone 'Asia/Jakarta', 'YYYY-MM')`;

const sumInt = (column: SQL | typeof payments.amount | typeof bookings.participants) =>
  sql<number>`coalesce(sum(${column}), 0)::bigint`;

/** When a refund happened: the recorded time, else the last update of the row. */
const refundedAt = sql`coalesce(${payments.refundedAt}, ${payments.updatedAt})`;

/** Money received in the range: every payment that was paid then (even if refunded later). */
const receivedIn = (range: Range) =>
  and(
    inArray(payments.status, ["paid", "refunded"]),
    gte(payments.paidAt, range.start),
    lt(payments.paidAt, range.end),
  );

// Raw `sql` params bypass column mapping, so instants are passed as ISO strings.
const refundedIn = (range: Range) =>
  and(
    eq(payments.status, "refunded"),
    sql`${refundedAt} >= ${range.start.toISOString()}::timestamptz`,
    sql`${refundedAt} < ${range.end.toISOString()}::timestamptz`,
  );

const bookedIn = (range: Range) =>
  and(gte(bookings.createdAt, range.start), lt(bookings.createdAt, range.end));

const toNumber = <T extends Record<string, unknown>>(rows: T[], keys: (keyof T)[]) =>
  rows.map((row) => {
    const copy = { ...row };
    for (const key of keys) copy[key] = Number(row[key] ?? 0) as T[keyof T];
    return copy;
  });

export const reportRepository = {
  async grossByMonth(range: Range) {
    const month = monthOf(payments.paidAt);
    const rows = await db
      .select({ month, amount: sumInt(payments.amount) })
      .from(payments)
      .where(receivedIn(range))
      .groupBy(month);
    return toNumber(rows, ["amount"]);
  },

  async refundsByMonth(range: Range) {
    const month = monthOf(refundedAt);
    const rows = await db
      .select({ month, amount: sumInt(payments.amount) })
      .from(payments)
      .where(refundedIn(range))
      .groupBy(month);
    return toNumber(rows, ["amount"]);
  },

  async bookingsByMonth(range: Range) {
    const month = monthOf(bookings.createdAt);
    const rows = await db
      .select({ month, bookings: count(), participants: sumInt(bookings.participants) })
      .from(bookings)
      .where(bookedIn(range))
      .groupBy(month);
    return toNumber(rows, ["bookings", "participants"]);
  },

  async bookingsByStatus(range: Range) {
    const rows = await db
      .select({
        status: bookings.status,
        bookings: count(),
        participants: sumInt(bookings.participants),
      })
      .from(bookings)
      .where(bookedIn(range))
      .groupBy(bookings.status);
    return toNumber(rows, ["bookings", "participants"]) as {
      status: BookingStatus;
      bookings: number;
      participants: number;
    }[];
  },

  async bookingsByTour(range: Range) {
    const rows = await db
      .select({
        tourId: bookings.tourId,
        bookings: count(),
        participants: sumInt(bookings.participants),
      })
      .from(bookings)
      .where(bookedIn(range))
      .groupBy(bookings.tourId);
    return toNumber(rows, ["bookings", "participants"]);
  },

  async grossByTour(range: Range) {
    const rows = await db
      .select({ tourId: bookings.tourId, amount: sumInt(payments.amount) })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(receivedIn(range))
      .groupBy(bookings.tourId);
    return toNumber(rows, ["amount"]);
  },

  async refundsByTour(range: Range) {
    const rows = await db
      .select({ tourId: bookings.tourId, amount: sumInt(payments.amount) })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(refundedIn(range))
      .groupBy(bookings.tourId);
    return toNumber(rows, ["amount"]);
  },

  /** Count and amount of refunds recorded in the range. */
  async refundTotals(range: Range) {
    const [row] = await db
      .select({ count: count(), amount: sumInt(payments.amount) })
      .from(payments)
      .where(refundedIn(range));
    return { count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) };
  },

  tourTitles(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return db
      .select({ id: tours.id, slug: tours.slug, title: tours.title })
      .from(tours)
      .where(inArray(tours.id, ids));
  },

  /** Payments flagged for a refund that hasn't been recorded yet (dashboard work queue). */
  async countRefundsRequired(): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(payments)
      .where(eq(payments.refundRequired, true));
    return row?.total ?? 0;
  },
};
