import "server-only";
import { logValue } from "@/lib/log";
import { siteUrl } from "@/lib/seo";
import { getEnv } from "@/server/env";
import { db, type DbExecutor } from "@/server/db";
import type { Payment } from "@/server/db/schema";
import {
  createSnapTransaction,
  MidtransError,
  type MidtransConfig,
} from "@/server/integrations/midtrans";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { closureRepository } from "@/server/repositories/closure.repository";
import {
  paymentRepository,
  type AdminPaymentFilters,
} from "@/server/repositories/payment.repository";
import { paginate } from "@/lib/pagination";
import { isoDateFromToday } from "@/lib/format";
import { canTransition } from "./booking.rules";
import { auditService } from "./audit.service";
import { DomainError } from "./errors";
import { notificationService } from "./notification.service";
import {
  amountMatches,
  assertRefundable,
  buildOrderId,
  isRefundReason,
  isReusable,
  refundAgeDays,
  refundReasonForPaidNotification,
  resolvePaymentStatus,
  type GatewayNotification,
  type RefundReason,
} from "./payment.rules";

export type { AdminPaymentFilters } from "@/server/repositories/payment.repository";

export type PaymentProvider = "midtrans" | "mock";

function midtransConfig(): MidtransConfig | null {
  const env = getEnv();
  if (!env.MIDTRANS_SERVER_KEY) return null;
  return {
    serverKey: env.MIDTRANS_SERVER_KEY,
    isProduction: env.MIDTRANS_IS_PRODUCTION === "true",
  };
}

/** The dev-only simulator is never available in production builds. */
export function isMockPaymentEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !midtransConfig();
}

function activeProvider(): PaymentProvider {
  if (midtransConfig()) return "midtrans";
  if (isMockPaymentEnabled()) return "mock";
  throw new DomainError("paymentUnavailable");
}

/** Public URL the gateway sends the traveller back to (SITE_URL first). */
function appUrl(path: string): string {
  return new URL(path, `${siteUrl()}/`).toString();
}

/**
 * Flags a paid payment whose money must go back to the traveller and records
 * why. Runs inside the caller's transaction so the flag and the audit entry
 * commit (or roll back) with the change that caused them. `actorId` is null
 * for system actions (gateway notifications).
 */
async function flagRefundRequired(
  tx: DbExecutor,
  payment: Pick<Payment, "id" | "orderId" | "bookingId" | "amount">,
  reason: RefundReason,
  actorId: string | null,
): Promise<void> {
  await paymentRepository.update(tx, payment.id, { refundRequired: true });
  await auditService.record(
    {
      actorId,
      action: "payment.refund_required",
      entityType: "payment",
      entityId: payment.id,
      details: {
        reason,
        orderId: payment.orderId,
        bookingId: payment.bookingId,
        amount: payment.amount,
      },
    },
    tx,
  );
}

export type NotificationOutcome =
  { result: "ignored"; reason: string } | { result: "updated"; status: Payment["status"] };

export const paymentService = {
  provider: activeProvider,

  /** Server key used to verify webhook signatures, or null when Midtrans is not configured. */
  webhookKey: () => midtransConfig()?.serverKey ?? null,

  /**
   * Starts (or resumes) a payment for the traveller's own pending booking and
   * returns the URL to send the browser to. The amount always comes from the DB.
   *
   * Runs under a lock on the booking row, so a double click or a second tab
   * reuses the same gateway session instead of opening a second charge. A
   * gateway failure rolls the new payment row back.
   */
  start(userId: string, bookingId: number): Promise<{ redirectUrl: string }> {
    return db.transaction(async (tx) => {
      const locked = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!locked) throw new DomainError("notFound");
      if (locked.userId !== userId) throw new DomainError("forbidden");
      if (locked.status !== "pending" || locked.travelDate < isoDateFromToday(0)) {
        throw new DomainError("notPayable");
      }
      if (await paymentRepository.hasPaid(locked.id, tx)) throw new DomainError("alreadyPaid");
      // A date closed after the booking was made (ceremony, weather) takes no new payments.
      if (await closureRepository.isClosed(locked.tourId, locked.travelDate, tx)) {
        throw new DomainError("dateClosed");
      }

      const provider = activeProvider();
      const latest = await paymentRepository.findLatestForBooking(locked.id, tx);
      if (
        latest &&
        latest.provider === provider &&
        latest.amount === locked.totalPrice &&
        isReusable(latest)
      ) {
        return { redirectUrl: latest.redirectUrl! };
      }

      const booking = await bookingRepository.findWithTourAndUser(locked.id, tx);
      if (!booking) throw new DomainError("notFound");

      const orderId = buildOrderId(booking.code);
      const payment = await paymentRepository.insert(tx, {
        bookingId: booking.id,
        provider,
        orderId,
        amount: booking.totalPrice,
      });

      let redirectUrl: string;
      if (provider === "midtrans") {
        try {
          const snap = await createSnapTransaction(midtransConfig()!, {
            orderId,
            grossAmount: booking.totalPrice,
            customer: {
              name: booking.contactName || booking.user.name,
              email: booking.user.email,
              phone: booking.contactPhone,
            },
            item: {
              id: `tour-${booking.tour.id}`,
              name: booking.tour.title.en,
              price: booking.unitPrice,
              quantity: booking.participants,
            },
            finishUrl: appUrl("/payment/finish"),
          });
          redirectUrl = snap.redirectUrl;
        } catch (error) {
          if (error instanceof MidtransError) {
            console.error("[payment] midtrans error", error.status, error.message);
            throw new DomainError("paymentGateway");
          }
          throw error;
        }
      } else {
        redirectUrl = `/payment/simulate?order=${encodeURIComponent(orderId)}`;
      }

      await paymentRepository.update(tx, payment.id, { redirectUrl });
      return { redirectUrl };
    });
  },

  /**
   * Applies a gateway notification. Callers must verify authenticity first
   * (signature for Midtrans webhooks; ownership + dev mode for the simulator).
   * Idempotent: replays and out-of-order notifications never undo a paid payment.
   */
  async handleNotification(notification: GatewayNotification): Promise<NotificationOutcome> {
    const status = resolvePaymentStatus(notification);

    const outcome = await db.transaction(
      async (tx): Promise<NotificationOutcome & { bookingId?: number; justPaid?: boolean }> => {
        const payment = await paymentRepository.findByOrderIdForUpdate(tx, notification.order_id);
        if (!payment) return { result: "ignored", reason: "unknown order" };
        if (payment.status === "paid") return { result: "ignored", reason: "already paid" };
        // Refunded money is settled outside the app; a late or replayed notification must not reopen it.
        if (payment.status === "refunded") return { result: "ignored", reason: "already refunded" };
        if (!amountMatches(notification.gross_amount, payment.amount)) {
          // Values come from the request body: neutralize them before logging.
          console.warn(
            `[payment] amount mismatch order=${logValue(notification.order_id)} gross=${logValue(notification.gross_amount)}`,
          );
          return { result: "ignored", reason: "amount mismatch" };
        }

        // Lock the booking before looking for other paid attempts: two attempts
        // settling at the same moment then serialize here, and the second one
        // sees the first as paid (and is flagged as a duplicate) instead of
        // both reading "nothing paid yet".
        const booking =
          status === "paid"
            ? await bookingRepository.findByIdForUpdate(tx, payment.bookingId)
            : undefined;
        // Any paid attempt at this point is a *different* one: this payment isn't paid yet.
        const alreadyPaid =
          status === "paid" && (await paymentRepository.hasPaid(payment.bookingId, tx));

        await paymentRepository.update(tx, payment.id, {
          status,
          method: notification.payment_type ?? payment.method,
          rawNotification: notification,
          paidAt: status === "paid" ? new Date() : null,
        });

        if (alreadyPaid) {
          console.warn(
            `[payment] booking ${payment.bookingId} was already paid; payment ${payment.orderId} is a duplicate charge, flagged for refund`,
          );
          await flagRefundRequired(tx, payment, "duplicate", null);
        } else if (status === "paid") {
          if (booking && canTransition(booking.status, "confirmed")) {
            await bookingRepository.updateStatusWith(tx, booking.id, "confirmed");
          } else {
            const reason = refundReasonForPaidNotification({
              alreadyPaid: false,
              bookingStatus: booking?.status,
            });
            if (reason) {
              console.warn(
                `[payment] booking ${booking?.code} was cancelled but payment ${payment.orderId} succeeded; flagged for refund`,
              );
              await flagRefundRequired(tx, payment, reason, null);
            }
          }
        }
        return {
          result: "updated",
          status,
          bookingId: payment.bookingId,
          justPaid: status === "paid" && !alreadyPaid,
        };
      },
    );

    if (outcome.result === "updated" && outcome.justPaid && outcome.bookingId) {
      await notificationService.paymentSucceeded(outcome.bookingId).catch((error) => {
        console.error("[payment] notification failed", error);
      });
    }
    return outcome.result === "updated"
      ? { result: "updated", status: outcome.status }
      : { result: "ignored", reason: outcome.reason };
  },

  /** Returns the payment with its booking only if it belongs to `userId`. */
  async getForUser(userId: string, orderId: string) {
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) return null;
    const booking = await bookingRepository.findWithTourAndUser(payment.bookingId);
    if (!booking || booking.userId !== userId) return null;
    return { payment, booking };
  },

  latestByBookingIds: (ids: number[]) => paymentRepository.latestByBookingIds(ids),

  /* -------------------------- admin -------------------------- */

  /**
   * Flags every paid attempt of a booking for refund, e.g. when an admin
   * cancels a booking that was already paid. Call inside the transaction that
   * changes the booking (the booking row should already be locked).
   */
  async flagPaidForRefund(
    tx: DbExecutor,
    bookingId: number,
    reason: RefundReason,
    actorId: string | null,
  ): Promise<number> {
    const paid = await paymentRepository.findPaidForBookingForUpdate(tx, bookingId);
    for (const payment of paid) {
      if (!payment.refundRequired) await flagRefundRequired(tx, payment, reason, actorId);
    }
    return paid.length;
  },

  /**
   * Records a refund made outside the app (bank transfer or the Midtrans
   * dashboard). Only a paid payment can be refunded; the payment row is locked
   * so two admins can't record the same refund twice.
   */
  recordRefund(actorId: string, paymentId: number, note: string): Promise<Payment> {
    return db.transaction(async (tx) => {
      const payment = await paymentRepository.findByIdForUpdate(tx, paymentId);
      if (!payment) throw new DomainError("notFound");
      assertRefundable(payment);
      const updated = await paymentRepository.update(tx, payment.id, {
        status: "refunded",
        refundRequired: false,
        refundedAt: new Date(),
        refundedBy: actorId,
        refundNote: note,
      });
      await auditService.record(
        {
          actorId,
          action: "payment.refunded",
          entityType: "payment",
          entityId: payment.id,
          details: {
            orderId: payment.orderId,
            bookingId: payment.bookingId,
            amount: payment.amount,
            note,
          },
        },
        tx,
      );
      return updated;
    });
  },

  /** Payments waiting for a refund, oldest first, with the reason from the audit log. */
  async refundQueue() {
    const rows = await paymentRepository.listRefundQueue();
    const flags = await paymentRepository.refundFlags(rows.map((row) => row.payment.id));
    const now = new Date();
    return rows.map((row) => {
      const flag = flags.get(row.payment.id);
      const reason = flag?.details?.reason;
      const flaggedAt = flag?.createdAt ?? row.payment.updatedAt;
      return {
        ...row,
        reason: isRefundReason(reason) ? reason : null,
        flaggedAt,
        ageDays: refundAgeDays(flaggedAt, now),
      };
    });
  },

  /** Admin payments page: filtered and paginated. */
  listForAdmin(filters: AdminPaymentFilters, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => paymentRepository.countAdmin(filters),
      load: (limit, offset) => paymentRepository.listAdmin(filters, limit, offset),
    });
  },
};
