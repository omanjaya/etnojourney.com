import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@/server/db/schema";

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
