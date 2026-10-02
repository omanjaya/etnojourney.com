import type { BookingStatus } from "@/server/db/schema";

/** Whole days from `fromIso` to `toIso` (both `YYYY-MM-DD`), ignoring time zones. */
export function daysBetween(fromIso: string, toIso: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}

/**
 * The soonest booking that is still going ahead (pending or confirmed) and
 * hasn't started yet, relative to `todayIso` (a business date).
 */
export function pickNextTrip<T extends { booking: { status: BookingStatus; travelDate: string } }>(
  rows: T[],
  todayIso: string,
): T | undefined {
  return rows
    .filter(
      ({ booking }) =>
        (booking.status === "pending" || booking.status === "confirmed") &&
        daysBetween(todayIso, booking.travelDate) >= 0,
    )
    .sort((a, b) => a.booking.travelDate.localeCompare(b.booking.travelDate))[0];
}
