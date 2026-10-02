import { isoDateFromToday } from "@/lib/format";

/** Reminders go out when the trip is this many days away (Asia/Jakarta) or fewer. */
export const REMINDER_DAYS_BEFORE = 3;
/** Review requests cover trips that ended between these many days ago. */
export const REVIEW_REQUEST_DAYS_AFTER = { min: 1, max: 14 } as const;
/** Upper bound per email kind and run, so one run can't flood the mail provider. */
export const TRIP_EMAIL_BATCH_LIMIT = 200;

export type TripEmailWindows = {
  /** Today's business date, `YYYY-MM-DD`. */
  today: string;
  reminder: { from: string; to: string };
  reviewRequest: { from: string; to: string };
};

/**
 * Travel-date windows for a run at `now`, in the business time zone:
 * reminders for trips from today up to `REMINDER_DAYS_BEFORE` days ahead,
 * review requests for trips 1-14 days in the past. Inclusive on both ends.
 */
export function tripEmailWindows(now: Date = new Date()): TripEmailWindows {
  return {
    today: isoDateFromToday(0, now),
    reminder: { from: isoDateFromToday(0, now), to: isoDateFromToday(REMINDER_DAYS_BEFORE, now) },
    reviewRequest: {
      from: isoDateFromToday(-REVIEW_REQUEST_DAYS_AFTER.max, now),
      to: isoDateFromToday(-REVIEW_REQUEST_DAYS_AFTER.min, now),
    },
  };
}

/** Whole days from `today` to `date` (both `YYYY-MM-DD`); negative when past. */
export function daysUntil(date: string, today: string): number {
  const toUtc = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}
