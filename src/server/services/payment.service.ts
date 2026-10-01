import "server-only";
import { logValue } from "@/lib/log";
import { siteUrl } from "@/lib/seo";
import { getEnv } from "@/server/env";
import { db } from "@/server/db";
import type { Payment } from "@/server/db/schema";
import {
  createSnapTransaction,
  MidtransError,
  type MidtransConfig,
} from "@/server/integrations/midtrans";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { paymentRepository } from "@/server/repositories/payment.repository";
import { isoDateFromToday } from "@/lib/format";
import { canTransition } from "./booking.rules";
import { DomainError } from "./errors";
import { notificationService } from "./notification.service";
import {
  amountMatches,
  buildOrderId,
  isReusable,
  resolvePaymentStatus,
  type GatewayNotification,
} from "./payment.rules";

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
        if (!amountMatches(notification.gross_amount, payment.amount)) {
          // Values come from the request body: neutralize them before logging.
          console.warn(
            `[payment] amount mismatch order=${logValue(notification.order_id)} gross=${logValue(notification.gross_amount)}`,
          );
          return { result: "ignored", reason: "amount mismatch" };
        }

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
            `[payment] booking ${payment.bookingId} was already paid; payment ${payment.orderId} is a duplicate charge, refund manually`,
          );
        } else if (status === "paid") {
          const booking = await bookingRepository.findByIdForUpdate(tx, payment.bookingId);
          if (booking && canTransition(booking.status, "confirmed")) {
            await bookingRepository.updateStatusWith(tx, booking.id, "confirmed");
          } else if (booking?.status === "cancelled") {
            console.warn(
              `[payment] booking ${booking.code} was cancelled but payment ${payment.orderId} succeeded; refund manually`,
            );
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
};
