import type { BookingStatus } from "@/server/db/schema";

export const REVIEW_BODY_MIN = 20;
export const REVIEW_BODY_MAX = 1000;
export const REVIEW_COUNTRY_MAX = 56;

export type ReviewEligibility = "ok" | "notFound" | "notOwner" | "notCompleted" | "alreadyReviewed";

/** Decides whether `userId` may review the given booking. */
export function reviewEligibility(params: {
  booking: { userId: string; status: BookingStatus } | null | undefined;
  userId: string;
  alreadyReviewed: boolean;
}): ReviewEligibility {
  const { booking, userId, alreadyReviewed } = params;
  if (!booking) return "notFound";
  if (booking.userId !== userId) return "notOwner";
  if (booking.status !== "completed") return "notCompleted";
  if (alreadyReviewed) return "alreadyReviewed";
  return "ok";
}

export type RatingAggregate = { rating: number; count: number };

/**
 * Adds (`direction = 1`) or removes (`direction = -1`) one rating from a tour's
 * aggregate. `count` is the historical review count, so the previous average is
 * treated as `count` ratings of `rating` each.
 */
export function applyReviewDelta(
  aggregate: RatingAggregate,
  rating: number,
  direction: 1 | -1,
): RatingAggregate {
  const count = Math.max(0, aggregate.count + direction);
  if (count === 0) return { rating: 0, count: 0 };
  const total = aggregate.rating * aggregate.count + direction * rating;
  const average = Math.round((total / count) * 10) / 10;
  return { rating: Math.min(5, Math.max(0, average)), count };
}
