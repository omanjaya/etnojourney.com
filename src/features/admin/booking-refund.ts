import { refundQuote } from "@/server/services/self-service.rules";
import type { PaidBookingRefund } from "./components/cancel-paid-booking-dialog";

/**
 * What the admin cancel dialog offers for a paid booking: the money taken
 * (not yet owed back) and the cancellation-policy share of it for `today`.
 * Null when nothing has been paid (a plain confirm is enough then).
 */
export function paidBookingRefund(
  paidAmount: number,
  travelDate: string,
  today: string,
): PaidBookingRefund | null {
  if (paidAmount <= 0) return null;
  const quote = refundQuote(paidAmount, travelDate, today);
  return { amount: paidAmount, policyPercent: quote.percent, policyAmount: quote.amount };
}
