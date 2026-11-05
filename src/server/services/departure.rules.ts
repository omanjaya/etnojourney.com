/**
 * Pure rules for departures: a tour on a date with at least one booking that
 * is not cancelled (pending, confirmed, or completed once the trip is over).
 * No I/O, so everything here is unit-tested.
 */
import type { BookingStatus } from "@/server/db/schema";

/**
 * Booking statuses that make a departure: the travelling party plus trips
 * already completed, so past departures stay in the agenda as a record.
 * Seat holds use `ACTIVE_STATUSES` (booking.rules) instead.
 */
export const DEPARTURE_STATUSES = ["pending", "confirmed", "completed"] as const;

/** Agenda default: today plus the next 30 days (Asia/Jakarta). */
export const DEFAULT_RANGE_DAYS = 30;
/** Longest range the agenda loads at once. */
export const MAX_RANGE_DAYS = 120;
/** Dashboard work queue: departures in the next 7 days (today included) without a guide. */
export const NEEDS_GUIDE_HORIZON_DAYS = 7;
/** Matches the `departure_assignments_note_length` check constraint. */
export const DEPARTURE_NOTE_MAX_LENGTH = 1000;

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** A real calendar date in YYYY-MM-DD (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DATE.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
  );
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/* ---------------------------------------------------------------- */
/* Identity                                                          */
/* ---------------------------------------------------------------- */

/** Audit entity id of a departure: `${tourId}:${date}`. */
export function departureEntityId(tourId: number, date: string): string {
  return `${tourId}:${date}`;
}

export function parseDepartureEntityId(value: string): { tourId: number; date: string } | null {
  const match = /^([1-9]\d*):(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (!match || !isIsoDate(match[2])) return null;
  return { tourId: Number(match[1]), date: match[2] };
}

/** Path of the departure detail page (without locale). */
export function departurePath(tourId: number, date: string): string {
  return `/admin/departures/${tourId}/${date}`;
}

/* ---------------------------------------------------------------- */
/* Date range                                                        */
/* ---------------------------------------------------------------- */

export type DateRange = { from: string; to: string };

/**
 * Agenda range from optional URL values. Missing or invalid ends fall back to
 * today / today + 30; a reversed range is swapped; a range longer than
 * MAX_RANGE_DAYS is cut at its start + MAX_RANGE_DAYS.
 */
export function resolveDateRange(
  input: { from?: string | null; to?: string | null },
  today: string,
): DateRange {
  let from = isIsoDate(input.from) ? input.from : null;
  let to = isIsoDate(input.to) ? input.to : null;
  if (from && to && from > to) [from, to] = [to, from];
  from ??= to && to < today ? addDays(to, -DEFAULT_RANGE_DAYS) : today;
  to ??= addDays(from, DEFAULT_RANGE_DAYS);
  if (daysBetween(from, to) > MAX_RANGE_DAYS) to = addDays(from, MAX_RANGE_DAYS);
  return { from, to };
}

/** Range used by the dashboard card: today .. today + 6 (seven days). */
export function needsGuideWindow(today: string): DateRange {
  return { from: today, to: addDays(today, NEEDS_GUIDE_HORIZON_DAYS - 1) };
}

/* ---------------------------------------------------------------- */
/* Capacity and guide                                                */
/* ---------------------------------------------------------------- */

export type CapacityLoad = {
  confirmed: number;
  pending: number;
  /** Seats held by active bookings (confirmed + pending). */
  booked: number;
  /** Seats still free (0 when full or overbooked). */
  remaining: number;
  /** Bar widths, 0..100, rounded; confirmed + pending never exceeds 100. */
  confirmedPercent: number;
  pendingPercent: number;
  overbooked: boolean;
};

export function capacityLoad(confirmed: number, pending: number, capacity: number): CapacityLoad {
  const booked = confirmed + pending;
  const safeCapacity = Math.max(capacity, 1);
  const confirmedPercent = Math.min(100, Math.round((confirmed / safeCapacity) * 100));
  const pendingPercent = Math.min(
    100 - confirmedPercent,
    Math.round((pending / safeCapacity) * 100),
  );
  return {
    confirmed,
    pending,
    booked,
    remaining: Math.max(0, capacity - booked),
    confirmedPercent,
    pendingPercent,
    overbooked: booked > capacity,
  };
}

/**
 * A departure needs a guide when nobody is assigned, or when the assigned
 * guide has since been deactivated.
 */
export function needsGuide(departure: {
  guideId: number | null;
  guideActive?: boolean | null;
}): boolean {
  return departure.guideId === null || departure.guideActive === false;
}

/**
 * Agenda flag: only departures from `today` on still need a guide. A past
 * departure without one is history, not a to-do.
 */
export function needsGuideOn(
  departure: { date: string; guideId: number | null; guideActive?: boolean | null },
  today: string,
): boolean {
  return departure.date >= today && needsGuide(departure);
}

/**
 * Whether a booking status change alters the guest list the guide was sent:
 * a booking dropping out (cancelled) or a pending one being confirmed (the
 * manifest flags pending rows). Completing a trip changes nothing.
 */
export function manifestChangedBy(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return false;
  return to === "cancelled" || (from === "pending" && to === "confirmed");
}

/* ---------------------------------------------------------------- */
/* Agenda grouping                                                   */
/* ---------------------------------------------------------------- */

/** Groups rows by date (ascending), keeping the input order within a date. */
export function groupByDate<T extends { date: string }>(
  rows: readonly T[],
): { date: string; departures: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.date);
    if (list) list.push(row);
    else groups.set(row.date, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, departures]) => ({ date, departures }));
}

/* ---------------------------------------------------------------- */
/* Manifest                                                          */
/* ---------------------------------------------------------------- */

/** Manifest order: confirmed (and completed) first, then pending, cancelled last. */
const STATUS_RANK: Record<BookingStatus, number> = {
  confirmed: 0,
  completed: 0,
  pending: 1,
  cancelled: 2,
};

export function sortManifest<T extends { status: BookingStatus; id: number }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.id - b.id);
}

export type ManifestTotals = {
  bookings: number;
  participants: number;
  confirmedParticipants: number;
  pendingParticipants: number;
  cancelledBookings: number;
};

/** Totals of the travelling party; cancelled bookings only counted separately. */
export function manifestTotals(
  rows: readonly { status: BookingStatus; participants: number }[],
): ManifestTotals {
  const totals: ManifestTotals = {
    bookings: 0,
    participants: 0,
    confirmedParticipants: 0,
    pendingParticipants: 0,
    cancelledBookings: 0,
  };
  for (const row of rows) {
    if (row.status === "cancelled") {
      totals.cancelledBookings += 1;
      continue;
    }
    totals.bookings += 1;
    totals.participants += row.participants;
    if (row.status === "pending") totals.pendingParticipants += row.participants;
    else totals.confirmedParticipants += row.participants;
  }
  return totals;
}

/**
 * Guides covering the tour's destination first; within each group, guides
 * free on the departure's days before those already on another departure
 * (`busyWith`), then by name.
 */
export function suggestGuides<
  T extends { name: string; coversDestination: boolean; busyWith?: readonly unknown[] },
>(guides: readonly T[]): { suggested: T[]; others: T[] } {
  const busy = (guide: T) => ((guide.busyWith?.length ?? 0) > 0 ? 1 : 0);
  const sorted = [...guides].sort(
    (a, b) => busy(a) - busy(b) || a.name.localeCompare(b.name, "id"),
  );
  return {
    suggested: sorted.filter((guide) => guide.coversDestination),
    others: sorted.filter((guide) => !guide.coversDestination),
  };
}

/* ---------------------------------------------------------------- */
/* History                                                           */
/* ---------------------------------------------------------------- */

type HistoryEntry = {
  log: { action: string; details: Record<string, unknown> | null; createdAt: Date };
  actorName: string | null;
};

/**
 * Who assigned the current guide, and when: the newest `departure.assigned`
 * entry (history is oldest first). Null when there is none, or when the
 * guide was unassigned after it.
 */
export function lastAssignment(
  history: readonly HistoryEntry[],
): { name: string | null; at: Date } | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const { log, actorName } = history[i];
    if (log.action === "departure.unassigned") return null;
    if (log.action === "departure.assigned") return { name: actorName, at: log.createdAt };
  }
  return null;
}

/**
 * The guide a departure history entry is about: the new guide for an
 * assignment or a manifest send, the previous one for an unassignment.
 * Details come from the database, so the id is validated.
 */
export function historyGuideId(
  action: string,
  details: Record<string, unknown> | null,
): number | null {
  const key =
    action === "departure.unassigned"
      ? "previousGuideId"
      : action === "departure.assigned" || action === "departure.notified"
        ? "guideId"
        : null;
  const value = key ? details?.[key] : null;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Guide phone numbers are often stored locally ("0812..."); wa.me needs the
 * country code, so an Indonesian leading 0 becomes 62. Anything else is
 * passed through for `whatsAppLink` to validate.
 */
export function guideWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const compact = phone.trim().replace(/[\s().-]/g, "");
  return /^0\d{8,13}$/.test(compact) ? `62${compact.slice(1)}` : compact;
}
