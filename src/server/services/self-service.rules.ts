import { cancellationPolicy } from "@/config/cancellation";
import type { BookingStatus } from "@/server/db/schema";
import { isoDateFromToday } from "@/lib/format";
import { addDays, isMonthInRange, monthOf } from "./availability.rules";
import { MIN_LEAD_DAYS } from "./booking.rules";

/**
 * Pure rules for traveller self-service: cancelling a booking (with a refund
 * from the policy tiers) and moving it to another date. Dates are business
 * calendar dates (`YYYY-MM-DD`, Asia/Jakarta); arithmetic is done in UTC so
 * results never depend on the host time zone. Safe to import from the client.
 */

export type SelfServicePolicy = {
  refundTiers: readonly { minDaysBefore: number; percent: number }[];
  maxReschedules: number;
  rescheduleMinDaysBefore: number;
};

const defaultPolicy: SelfServicePolicy = cancellationPolicy;

export type SelfServiceBooking = {
  status: BookingStatus;
  travelDate: string;
  rescheduleCount: number;
};

/** Statuses a traveller can still cancel or move (the trip hasn't happened). */
const OPEN_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

/** Today's business date (Asia/Jakarta), whatever the server time zone. */
export function businessToday(now: Date = new Date()): string {
  return isoDateFromToday(0, now);
}

const utcOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole calendar days from `today` to `travelDate` (negative once it has passed). */
export function daysBefore(travelDate: string, today: string): number {
  return Math.round((utcOf(travelDate) - utcOf(today)) / 86_400_000);
}

/* ------------------------------ refunds ------------------------------ */

/** Tiers from most to least days, whatever order the config lists them in. */
function sortedTiers(policy: SelfServicePolicy) {
  return [...policy.refundTiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
}

/** Refund share (0-100) for a cancellation `days` before travel; 0 when no tier matches. */
export function refundPercentFor(days: number, policy: SelfServicePolicy = defaultPolicy): number {
  const tier = sortedTiers(policy).find((t) => days >= t.minDaysBefore);
  return tier ? Math.min(100, Math.max(0, tier.percent)) : 0;
}

/** Rupiah owed back for `paidAmount`, rounded down to a whole rupiah. */
export function refundAmountFor(
  paidAmount: number,
  days: number,
  policy: SelfServicePolicy = defaultPolicy,
): number {
  const amount = Math.max(0, Math.trunc(paidAmount));
  // Integer maths: (amount * percent) stays exact for any realistic price.
  return Math.floor((amount * refundPercentFor(days, policy)) / 100);
}

export type RefundQuote = {
  daysBefore: number;
  percent: number;
  /** Rupiah owed back (0 when no refund applies). */
  amount: number;
  /** Whether the payment must be flagged for a refund at all. */
  refundable: boolean;
  /**
   * Value for `payments.refundAmount`: null means the full payment goes back,
   * a number means a partial refund of that many rupiah.
   */
  storedAmount: number | null;
};

/** Everything the cancel dialog and the service need for one paid amount. */
export function refundQuote(
  paidAmount: number,
  travelDate: string,
  today: string,
  policy: SelfServicePolicy = defaultPolicy,
): RefundQuote {
  const days = daysBefore(travelDate, today);
  const percent = refundPercentFor(days, policy);
  const amount = refundAmountFor(paidAmount, days, policy);
  return {
    daysBefore: days,
    percent,
    amount,
    refundable: amount > 0,
    storedAmount: percent >= 100 ? null : amount,
  };
}

/* ------------------------------ cancel ------------------------------ */

export type CancelBlocker = "status" | "past";

/** Why the traveller can't cancel this booking themselves, or null when they can. */
export function cancelBlocker(booking: SelfServiceBooking, today: string): CancelBlocker | null {
  if (!OPEN_STATUSES.includes(booking.status)) return "status";
  if (daysBefore(booking.travelDate, today) < 0) return "past";
  return null;
}

/** Pending or confirmed, and the travel date is today or later. */
export function canTravellerCancel(booking: SelfServiceBooking, today: string): boolean {
  return cancelBlocker(booking, today) === null;
}

export type CancelOption =
  /** Unpaid and still pending: cancel for free (nothing to refund). */
  | { kind: "free" }
  /** Paid: cancel under the policy tiers. */
  | { kind: "paid"; quote: RefundQuote };

/**
 * What cancelling would mean for the traveller, or null when they can't.
 * `paidAmount` is the money taken for the booking (null when nothing was
 * paid). An unpaid booking can be cancelled while it is pending; a paid one
 * while it is pending or confirmed and the travel date hasn't passed.
 */
export function cancelOption(
  booking: SelfServiceBooking,
  paidAmount: number | null,
  today: string,
  policy: SelfServicePolicy = defaultPolicy,
): CancelOption | null {
  if (paidAmount === null) return booking.status === "pending" ? { kind: "free" } : null;
  if (!canTravellerCancel(booking, today)) return null;
  return { kind: "paid", quote: refundQuote(paidAmount, booking.travelDate, today, policy) };
}

/* ----------------------------- reschedule ----------------------------- */

export type RescheduleBlocker = "status" | "tooLate" | "limit";

/** Why the traveller can't move this booking, or null when they can. */
export function rescheduleBlocker(
  booking: SelfServiceBooking,
  today: string,
  policy: SelfServicePolicy = defaultPolicy,
): RescheduleBlocker | null {
  if (!OPEN_STATUSES.includes(booking.status)) return "status";
  if (booking.rescheduleCount >= policy.maxReschedules) return "limit";
  if (daysBefore(booking.travelDate, today) < policy.rescheduleMinDaysBefore) return "tooLate";
  return null;
}

/**
 * Pending or confirmed, the current travel date is at least
 * `rescheduleMinDaysBefore` days away, and the booking has been moved fewer
 * than `maxReschedules` times.
 */
export function canTravellerReschedule(
  booking: SelfServiceBooking,
  today: string,
  policy: SelfServicePolicy = defaultPolicy,
): boolean {
  return rescheduleBlocker(booking, today, policy) === null;
}

export type NewDateIssue = "sameDate" | "tooSoon" | "tooFar";

/**
 * Checks the requested new date on its own (closures and seats are checked
 * against the database): it must differ from the current date, respect the
 * booking lead time and fall inside the bookable window.
 */
export function newDateIssue(
  currentDate: string,
  newDate: string,
  today: string,
): NewDateIssue | null {
  if (newDate === currentDate) return "sameDate";
  if (newDate < addDays(today, MIN_LEAD_DAYS)) return "tooSoon";
  if (!isMonthInRange(monthOf(newDate), today)) return "tooFar";
  return null;
}

/* ---------------------------- policy copy ---------------------------- */

export type TierRange = {
  /** Fewest days before travel this tier covers. */
  from: number;
  /** Most days it covers, or null for "and more". */
  to: number | null;
  percent: number;
};

/** The tiers as day ranges for the policy page, most days first. */
export function tierRanges(policy: SelfServicePolicy = defaultPolicy): TierRange[] {
  const tiers = sortedTiers(policy);
  return tiers.map((tier, i) => ({
    from: tier.minDaysBefore,
    to: i === 0 ? null : tiers[i - 1].minDaysBefore - 1,
    percent: Math.min(100, Math.max(0, tier.percent)),
  }));
}
