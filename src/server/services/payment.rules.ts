import { createHash, timingSafeEqual } from "node:crypto";
import type { BookingStatus, PaymentStatus } from "@/server/db/schema";
import { DomainError } from "./errors";

/** A pending gateway session is reused for this long before a new one is created. */
const PAYMENT_REUSE_WINDOW_MS = 23 * 60 * 60 * 1000;

/** Subset of the Midtrans HTTP notification we rely on. */
export type GatewayNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  [key: string]: unknown;
};

export function computeSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

/** Constant-time check of `signature_key` against the expected SHA-512 digest. */
export function verifySignature(notification: GatewayNotification, serverKey: string): boolean {
  const { signature_key: given, order_id, status_code, gross_amount } = notification;
  if (typeof given !== "string" || !order_id || !status_code || !gross_amount) return false;
  const expected = computeSignature(order_id, status_code, gross_amount, serverKey);
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Maps Midtrans `transaction_status` (+ `fraud_status`) to our payment status. */
export function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): PaymentStatus {
  switch (transactionStatus) {
    case "capture":
      // Card captures flagged as "challenge" still need manual review.
      return fraudStatus === "accept" || fraudStatus === undefined ? "paid" : "pending";
    case "settlement":
      return "paid";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

/** Midtrans `status_code` for a successful capture or settlement. */
const SUCCESS_STATUS_CODE = "200";

/**
 * Status to apply for a verified notification. The Midtrans signature covers
 * `status_code` but not `transaction_status`, so a "paid" outcome is only
 * trusted when the signed status code agrees (200); otherwise it stays pending.
 */
export function resolvePaymentStatus(
  notification: Pick<GatewayNotification, "transaction_status" | "fraud_status" | "status_code">,
): PaymentStatus {
  const status = mapTransactionStatus(notification.transaction_status, notification.fraud_status);
  if (status === "paid" && notification.status_code !== SUCCESS_STATUS_CODE) return "pending";
  return status;
}

/** Gateway amounts arrive as strings such as "1400000.00". */
export function amountMatches(grossAmount: string, expected: number): boolean {
  const value = Number(grossAmount);
  return Number.isFinite(value) && Math.round(value) === expected;
}

/** Unique per attempt so a retry after expiry gets a fresh gateway order. */
export function buildOrderId(bookingCode: string, now: number = Date.now()): string {
  return `${bookingCode}-${now}`;
}

export function isReusable(
  payment: { status: PaymentStatus; redirectUrl: string | null; createdAt: Date },
  now: number = Date.now(),
): boolean {
  return (
    payment.status === "pending" &&
    Boolean(payment.redirectUrl) &&
    now - payment.createdAt.getTime() < PAYMENT_REUSE_WINDOW_MS
  );
}

/* ---------------------------------------------------------------- */
/* Refunds                                                           */
/* ---------------------------------------------------------------- */

/** Why a payment was flagged for a refund (stored in the audit log details). */
export const refundReasons = ["duplicate", "cancelledBooking", "cancelledAfterPayment"] as const;
export type RefundReason = (typeof refundReasons)[number];

export function isRefundReason(value: unknown): value is RefundReason {
  return typeof value === "string" && (refundReasons as readonly string[]).includes(value);
}

/**
 * Whether a payment that just became paid must go back to the traveller:
 * another attempt already paid the booking (duplicate charge), or the booking
 * was cancelled before the money arrived.
 */
export function refundReasonForPaidNotification(input: {
  alreadyPaid: boolean;
  bookingStatus: BookingStatus | undefined;
}): RefundReason | null {
  if (input.alreadyPaid) return "duplicate";
  if (input.bookingStatus === "cancelled") return "cancelledBooking";
  return null;
}

/** Only money that was actually taken (and not yet returned) can be refunded. */
/**
 * Only money that is owed back can be marked refunded: a paid payment flagged
 * by the system (duplicate charge, paid but cancelled). Refunding a live
 * booking's payment would leave it "confirmed" with nothing paid.
 */
export function canRecordRefund(payment: {
  status: PaymentStatus;
  refundRequired: boolean;
}): boolean {
  return payment.status === "paid" && payment.refundRequired;
}

export function assertRefundable(payment: {
  status: PaymentStatus;
  refundRequired: boolean;
}): void {
  if (!canRecordRefund(payment)) throw new DomainError("notRefundable");
}

/** Whole days a refund has been waiting (0 on the day it was flagged). */
export function refundAgeDays(since: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86_400_000));
}

/**
 * What must go back for a flagged payment: `refundAmount` when the policy
 * gives a partial refund, otherwise the full amount paid.
 */
export function refundDue(payment: { amount: number; refundAmount: number | null }): {
  amount: number;
  partial: boolean;
  /** Share of the payment, rounded to a whole percent. */
  percent: number;
} {
  if (payment.refundAmount === null || payment.refundAmount >= payment.amount) {
    return { amount: payment.amount, partial: false, percent: 100 };
  }
  const amount = Math.max(0, payment.refundAmount);
  const percent = payment.amount > 0 ? Math.round((amount * 100) / payment.amount) : 0;
  return { amount, partial: true, percent };
}
