import "server-only";
import { isoDateFromToday } from "@/lib/format";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import {
  buildMonthAvailability,
  daysInMonth,
  isMonthInRange,
  type MonthAvailability,
} from "./availability.rules";
import { DomainError } from "./errors";

export const availabilityService = {
  /**
   * Seats left per date for one month of a published tour. Only aggregate
   * counts are returned. Booking itself re-checks capacity under a lock, so
   * this view is advisory.
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
    const taken = await availabilityRepository.seatsTakenByDate(tourId, days[0], days.at(-1)!);
    return buildMonthAvailability({ month, today, capacity: tour.maxParticipants, taken });
  },
};
