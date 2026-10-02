import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import {
  auditLogs,
  bookings,
  payments,
  tours,
  user,
  type Payment,
  type PaymentStatus,
} from "@/server/db/schema";

export type AdminPaymentFilters = {
  /** Matches booking code or gateway order id. */
  q?: string;
  status?: PaymentStatus;
};

function adminConditions(filters: AdminPaymentFilters): SQL | undefined {
  const pattern = filters.q ? likePattern(filters.q) : undefined;
  return and(
    filters.status ? eq(payments.status, filters.status) : undefined,
    pattern ? or(ilike(bookings.code, pattern), ilike(payments.orderId, pattern)) : undefined,
  );
}

/** Payment plus the booking, tour and traveller an admin needs to identify it. */
const adminRow = {
  payment: payments,
  booking: {
    id: bookings.id,
    code: bookings.code,
    status: bookings.status,
    travelDate: bookings.travelDate,
  },
  tour: { id: tours.id, slug: tours.slug, title: tours.title },
  customer: { id: user.id, name: user.name, email: user.email },
};

export const paymentRepository = {
  insert(tx: DbExecutor, values: typeof payments.$inferInsert): Promise<Payment> {
    return tx
      .insert(payments)
      .values(values)
      .returning()
      .then((rows) => rows[0]);
  },

  update(tx: DbExecutor, id: number, values: Partial<typeof payments.$inferInsert>) {
    return tx
      .update(payments)
      .set(values)
      .where(eq(payments.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  findByOrderId(orderId: string) {
    return db.query.payments.findFirst({ where: eq(payments.orderId, orderId) });
  },

  /** Row-locks the payment so concurrent notifications are applied one at a time. */
  findByOrderIdForUpdate(tx: DbExecutor, orderId: string): Promise<Payment | undefined> {
    return tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .for("update")
      .then((rows) => rows[0]);
  },

  findLatestForBooking(bookingId: number, tx: DbExecutor = db): Promise<Payment | undefined> {
    return tx
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt))
      .limit(1)
      .then((rows) => rows[0]);
  },

  async hasPaid(bookingId: number, tx: DbExecutor = db): Promise<boolean> {
    const rows = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "paid")))
      .limit(1);
    return rows.length > 0;
  },

  async latestByBookingIds(ids: number[]): Promise<Map<number, Payment>> {
    if (ids.length === 0) return new Map();
    const rows = await db
      .select()
      .from(payments)
      .where(inArray(payments.bookingId, ids))
      .orderBy(desc(payments.createdAt));
    const latest = new Map<number, Payment>();
    // A paid attempt always wins over newer failed/expired ones.
    for (const row of rows) {
      const current = latest.get(row.bookingId);
      if (!current || (row.status === "paid" && current.status !== "paid"))
        latest.set(row.bookingId, row);
    }
    return latest;
  },

  /* ------------------------- refunds / admin ------------------------- */

  findByIdForUpdate(tx: DbExecutor, id: number): Promise<Payment | undefined> {
    return tx
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  /** Paid attempts of a booking, row-locked (normally zero or one). */
  findPaidForBookingForUpdate(tx: DbExecutor, bookingId: number): Promise<Payment[]> {
    return tx
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "paid")))
      .for("update");
  },

  /** Payments whose money must go back, oldest first. */
  listRefundQueue() {
    return db
      .select(adminRow)
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(eq(payments.refundRequired, true))
      .orderBy(asc(payments.updatedAt), asc(payments.id));
  },

  /** Latest `payment.refund_required` audit entry per payment id. */
  async refundFlags(paymentIds: number[]) {
    const flags = new Map<number, { details: Record<string, unknown> | null; createdAt: Date }>();
    if (paymentIds.length === 0) return flags;
    const rows = await db
      .select({
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "payment.refund_required"),
          eq(auditLogs.entityType, "payment"),
          inArray(auditLogs.entityId, paymentIds.map(String)),
        ),
      )
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));
    for (const row of rows) {
      const id = Number(row.entityId);
      if (!flags.has(id)) flags.set(id, { details: row.details, createdAt: row.createdAt });
    }
    return flags;
  },

  /** Admin payments list: one page matching the filters, newest first. */
  listAdmin(filters: AdminPaymentFilters, limit: number, offset: number) {
    return db
      .select(adminRow)
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(adminConditions(filters))
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(limit)
      .offset(offset);
  },

  countAdmin(filters: AdminPaymentFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(adminConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },
};
