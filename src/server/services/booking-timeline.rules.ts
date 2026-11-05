/**
 * Builds the admin booking timeline from the booking itself, its payments and
 * the audit log. Pure so the ordering and merging rules stay unit-tested.
 */
import { bookingStatus, type BookingStatus } from "@/server/db/schema";

export type TimelineAuditEntry = {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string | null;
};

export type TimelinePayment = {
  id: number;
  orderId: string;
  amount: number;
  paidAt: Date | null;
};

export type TimelineEvent =
  | { key: string; kind: "created"; at: Date; actorName: string }
  | { key: string; kind: "paid"; at: Date; orderId: string; amount: number }
  | {
      key: string;
      kind: "audit";
      at: Date;
      action: string;
      actorName: string | null;
      details: Record<string, unknown> | null;
    };

/** Newest first; events at the same instant keep a stable, readable order. */
export function buildBookingTimeline(input: {
  createdAt: Date;
  createdBy: string;
  payments: TimelinePayment[];
  audit: TimelineAuditEntry[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { key: "created", kind: "created", at: input.createdAt, actorName: input.createdBy },
  ];
  for (const payment of input.payments) {
    if (!payment.paidAt) continue;
    events.push({
      key: `paid-${payment.id}`,
      kind: "paid",
      at: payment.paidAt,
      orderId: payment.orderId,
      amount: payment.amount,
    });
  }
  for (const entry of input.audit) {
    events.push({
      key: `audit-${entry.id}`,
      kind: "audit",
      at: entry.createdAt,
      action: entry.action,
      actorName: entry.actorName,
      details: entry.details,
    });
  }

  // Ties: creation sorts last (it happened first), then insertion order reversed.
  const rank = (event: TimelineEvent) => (event.kind === "created" ? 1 : 0);
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (a, b) =>
        b.event.at.getTime() - a.event.at.getTime() ||
        rank(a.event) - rank(b.event) ||
        b.index - a.index,
    )
    .map(({ event }) => event);
}

/** `booking.status_changed` -> `booking_status_changed` (next-intl keys can't contain dots). */
export const auditMessageKey = (action: string) => action.replace(/\./g, "_");

/** The timeline message for an audit entry, with the details it shows. */
export type TimelineLabel =
  | { key: "booking_status_changed"; status: BookingStatus }
  | { key: "booking_note_added" }
  | { key: "booking_rescheduled"; from: string; to: string }
  | { key: "booking_cancelled_by_traveller" }
  | { key: "booking_cancelled_by_traveller_paid"; percent: number; amount: number }
  | { key: "booking_expired" }
  | { key: "payment_refund_required"; amount: number }
  | { key: "payment_refunded"; amount: number };

const isoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const amount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isStatus = (value: unknown): value is BookingStatus =>
  (bookingStatus.enumValues as readonly unknown[]).includes(value);

/**
 * Which message describes an audit entry on the booking timeline, with the
 * values it needs (dates as `YYYY-MM-DD`, amounts in rupiah). Null when the
 * verb has no timeline message or its details can't be read: the caller then
 * falls back to the activity-log label, never to the raw verb.
 */
export function timelineLabel(
  action: string,
  details: Record<string, unknown> | null,
): TimelineLabel | null {
  const d = details ?? {};
  switch (action) {
    case "booking.status_changed":
      return isStatus(d.status) ? { key: "booking_status_changed", status: d.status } : null;
    case "booking.note_added":
      return { key: "booking_note_added" };
    case "booking.rescheduled":
      return isoDate(d.from) && isoDate(d.to)
        ? { key: "booking_rescheduled", from: d.from, to: d.to }
        : null;
    case "booking.cancelled_by_traveller":
      return d.paid === true && amount(d.percent) && amount(d.refundAmount)
        ? { key: "booking_cancelled_by_traveller_paid", percent: d.percent, amount: d.refundAmount }
        : { key: "booking_cancelled_by_traveller" };
    case "booking.expired":
      return { key: "booking_expired" };
    case "payment.refund_required":
    case "payment.refunded": {
      // A partial refund records `refundAmount`; otherwise the whole payment goes back.
      const owed = amount(d.refundAmount) ? d.refundAmount : d.amount;
      if (!amount(owed)) return null;
      return action === "payment.refunded"
        ? { key: "payment_refunded", amount: owed }
        : { key: "payment_refund_required", amount: owed };
    }
    default:
      return null;
  }
}
