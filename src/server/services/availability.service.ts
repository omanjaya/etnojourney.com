import "server-only";
import { db } from "@/server/db";
import { isoDateFromToday } from "@/lib/format";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import { closureRepository } from "@/server/repositories/closure.repository";
import {
  buildAdminMonth,
  buildMonthAvailability,
  closureRangeIssue,
  dateRange,
  daysInMonth,
  groupClosures,
  isMonthInRange,
  type MonthAvailability,
} from "./availability.rules";
import { DomainError } from "./errors";

/** Upcoming closures shown in the back-office list (before grouping). */
const UPCOMING_LIMIT = 500;

export type ClosureRangeInput = { tourId: number | null; from: string; to: string };

/** Closures apply to an existing tour, or to all tours (`null`). */
async function assertScope(tourId: number | null) {
  if (tourId === null) return null;
  const tour = await availabilityRepository.findTour(tourId);
  if (!tour) throw new DomainError("notFound");
  return tour;
}

function assertRange(input: ClosureRangeInput, now: Date) {
  if (closureRangeIssue({ from: input.from, to: input.to, today: isoDateFromToday(0, now) })) {
    throw new DomainError("closureRange");
  }
}

/** Bookings that keep their seats on the range (closing never cancels them). */
async function affectedBookings({ tourId, from, to }: ClosureRangeInput) {
  const load = await availabilityRepository.loadByDate(tourId, from, to);
  let bookings = 0;
  let seats = 0;
  for (const day of load.values()) {
    bookings += day.bookings;
    seats += day.seats;
  }
  return { bookings, seats, dates: load.size };
}

export const availabilityService = {
  /**
   * Seats left per date for one month of a published tour, with closed dates
   * marked. Only aggregate counts are returned. Booking itself re-checks
   * capacity and closures under a lock, so this view is advisory.
   */
  async forMonth(
    tourId: number,
    month: string,
    now: Date = new Date(),
  ): Promise<MonthAvailability> {
    const today = isoDateFromToday(0, now);
    if (!isMonthInRange(month, today)) throw new DomainError("notFound");

    const tour = await availabilityRepository.findTour(tourId);
    if (!tour || !tour.isPublished) throw new DomainError("notFound");

    const days = daysInMonth(month);
    const [taken, closed] = await Promise.all([
      availabilityRepository.seatsTakenByDate(tourId, days[0], days.at(-1)!),
      closureRepository.closedDatesForTour(tourId, days[0], days.at(-1)!),
    ]);
    return buildMonthAvailability({
      month,
      today,
      capacity: tour.maxParticipants,
      taken,
      closed,
    });
  },

  /* -------------------------- admin -------------------------- */

  listTourOptions: () => availabilityRepository.listTourOptions(),

  /** Back-office month: bookings, capacity and closures per date. */
  async adminMonth(tourId: number | null, month: string, now: Date = new Date()) {
    const today = isoDateFromToday(0, now);
    const tour = await assertScope(tourId);
    const days = daysInMonth(month);
    const [load, closures] = await Promise.all([
      availabilityRepository.loadByDate(tourId, days[0], days.at(-1)!),
      closureRepository.listInRange(tourId, days[0], days.at(-1)!),
    ]);
    return buildAdminMonth({
      month,
      today,
      tourId,
      capacity: tour?.maxParticipants ?? null,
      load,
      closures,
    });
  },

  /** Upcoming closures folded into runs of consecutive dates. */
  async upcomingClosures(now: Date = new Date()) {
    const rows = await closureRepository.listUpcoming(isoDateFromToday(0, now), UPCOMING_LIMIT);
    return groupClosures(rows);
  },

  /**
   * What closing a range would do: how many dates are new and how many
   * pending or confirmed bookings fall on them (they are kept, not cancelled).
   */
  async previewClosure(input: ClosureRangeInput, now: Date = new Date()) {
    assertRange(input, now);
    await assertScope(input.tourId);
    const [already, affected] = await Promise.all([
      closureRepository.datesClosedForScope(input.tourId, input.from, input.to),
      affectedBookings(input),
    ]);
    const total = dateRange(input.from, input.to).length;
    return {
      days: total,
      alreadyClosed: already.length,
      newDays: total - already.length,
      affected,
    };
  },

  /** Closes every date in the range for one tour or all tours; already closed dates are skipped. */
  async close(
    input: ClosureRangeInput & { reason: string | null },
    actorId: string,
    now: Date = new Date(),
  ) {
    assertRange(input, now);
    await assertScope(input.tourId);
    const values = dateRange(input.from, input.to).map((date) => ({
      tourId: input.tourId,
      date,
      reason: input.reason,
      createdBy: actorId,
    }));
    const [created, affected] = await Promise.all([
      db.transaction((tx) => closureRepository.insertMany(tx, values)),
      affectedBookings(input),
    ]);
    return { created, affected };
  },

  /** Reopens dates by deleting their closures; returns the rows removed. */
  reopen(ids: number[]) {
    return db.transaction((tx) => closureRepository.deleteByIds(tx, ids));
  },
};
