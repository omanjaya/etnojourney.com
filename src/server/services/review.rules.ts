import type { BookingStatus } from "@/server/db/schema";

export const REVIEW_BODY_MIN = 20;
export const REVIEW_BODY_MAX = 1000;
export const REVIEW_COUNTRY_MAX = 56;
/** Team reply under a review (matches the `reviews_reply_length` DB check). */
export const REVIEW_REPLY_MAX = 2000;

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

/* ----------------------------- review photos ----------------------------- */

/** Photos a traveller can attach to one review (stored at positions 0..3). */
export const REVIEW_PHOTOS_MAX = 4;
/** Per-file upload cap, matching the shared image pipeline and its copy ("8 MB"). */
export const REVIEW_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
/** Longest edge after re-encoding: plenty for a lightbox, light on storage. */
export const REVIEW_PHOTO_MAX_EDGE = 1600;
export const REVIEW_PHOTO_QUALITY = 80;
/** Uploads per traveller per window (abandoned forms and retries included). */
export const REVIEW_PHOTO_UPLOAD_LIMIT = { max: 16, windowMs: 60 * 60_000 } as const;

/** Paths the storage layer produces for review photos; nothing else is linked. */
const REVIEW_PHOTO_PATH = /^\/media\/reviews\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.webp$/;

export function isReviewPhotoPath(path: string): boolean {
  return REVIEW_PHOTO_PATH.test(path);
}

export type ReviewPhotoInput = { path: string; width: number; height: number };
export type PositionedReviewPhoto = ReviewPhotoInput & { position: number };

export type ReviewPhotoProblem = "tooMany" | "invalid";

/**
 * Validates the photos submitted with a review and assigns positions in
 * submission order (0..n-1). Duplicates are dropped, not counted.
 */
export function arrangeReviewPhotos(
  photos: readonly ReviewPhotoInput[],
): { ok: true; photos: PositionedReviewPhoto[] } | { ok: false; problem: ReviewPhotoProblem } {
  const seen = new Set<string>();
  const unique: ReviewPhotoInput[] = [];
  for (const photo of photos) {
    if (!isReviewPhotoPath(photo.path)) return { ok: false, problem: "invalid" };
    if (![photo.width, photo.height].every((n) => Number.isInteger(n) && n > 0)) {
      return { ok: false, problem: "invalid" };
    }
    if (seen.has(photo.path)) continue;
    seen.add(photo.path);
    unique.push(photo);
  }
  if (unique.length > REVIEW_PHOTOS_MAX) return { ok: false, problem: "tooMany" };
  return { ok: true, photos: unique.map((photo, position) => ({ ...photo, position })) };
}

/**
 * The exact string an upload receipt signs: binds a stored photo to the
 * traveller and the booking it was uploaded for, so a review can only link
 * photos its own author uploaded for that trip.
 */
export function reviewPhotoReceiptPayload(params: {
  userId: string;
  bookingId: number;
  photo: ReviewPhotoInput;
}): string {
  const { userId, bookingId, photo } = params;
  return ["review-photo:v1", userId, bookingId, photo.path, photo.width, photo.height].join("|");
}
