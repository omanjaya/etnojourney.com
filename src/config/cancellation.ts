/**
 * Cancellation and reschedule policy: the single source for the rules the
 * server enforces and the copy on /cancellation-policy.
 *
 * DEFAULT VALUES, TO BE CONFIRMED BY THE BUSINESS. Change them here only; the
 * policy page, the cancel dialog and the refund amounts all follow.
 */
export const cancellationPolicy = {
  /**
   * Refund share for a paid booking cancelled by the traveller, by whole days
   * between the cancellation (Asia/Jakarta date) and the travel date. First
   * matching tier wins, ordered from most to least days.
   */
  refundTiers: [
    { minDaysBefore: 14, percent: 100 },
    { minDaysBefore: 7, percent: 50 },
    { minDaysBefore: 0, percent: 0 },
  ],
  /** A traveller can move the date at most this many times per booking. */
  maxReschedules: 1,
  /** Rescheduling closes this many days before the current travel date. */
  rescheduleMinDaysBefore: 3,
} as const;

export type RefundTier = (typeof cancellationPolicy.refundTiers)[number];
