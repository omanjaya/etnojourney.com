/**
 * Builds the admin booking timeline from the booking itself, its payments and
 * the audit log. Pure so the ordering and merging rules stay unit-tested.
 */

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
