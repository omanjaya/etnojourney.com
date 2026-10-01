import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { payments, type Payment } from "@/server/db/schema";

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
};
