import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { getEnv } from "@/server/env";
import { storeImage } from "@/server/storage/image-processing";
import type { Locale } from "@/i18n/routing";
import { paginate } from "@/lib/pagination";
import { reviewRepository, type AdminReviewFilters } from "@/server/repositories/review.repository";
import { DomainError } from "./errors";
import {
  applyReviewDelta,
  arrangeReviewPhotos,
  REVIEW_PHOTO_MAX_EDGE,
  REVIEW_PHOTO_QUALITY,
  reviewEligibility,
  reviewPhotoReceiptPayload,
  type ReviewEligibility,
  type ReviewPhotoInput,
} from "./review.rules";

/** A stored review photo plus the receipt proving who uploaded it, for which booking. */
export type ReviewPhotoUpload = ReviewPhotoInput & { receipt: string };

export type CreateReviewInput = {
  bookingId: number;
  rating: number;
  body: string;
  country: string;
  language: Locale;
  photos?: ReviewPhotoUpload[];
};

export type PublicReviewPhoto = { id: number; path: string; width: number; height: number };

function signReceipt(payload: string): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(payload).digest("base64url");
}

function receiptMatches(payload: string, receipt: string): boolean {
  const expected = Buffer.from(signReceipt(payload));
  const given = Buffer.from(receipt);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function groupByReview<T extends { reviewId: number }>(rows: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const list = map.get(row.reviewId);
    if (list) list.push(row);
    else map.set(row.reviewId, [row]);
  }
  return map;
}

export const reviewService = {
  highlights: (limit = 3) => reviewRepository.latestHighlights(limit),

  summary: () => reviewRepository.summary(),

  reviewedBookingIds: (userId: string): Promise<Set<number>> =>
    reviewRepository.reviewedBookingIds(userId),

  async eligibility(userId: string, bookingId: number): Promise<ReviewEligibility> {
    const booking = await reviewRepository.findBookingForReview(bookingId);
    const alreadyReviewed = booking
      ? await reviewRepository.existsForBooking(db, bookingId)
      : false;
    return reviewEligibility({ booking, userId, alreadyReviewed });
  },

  /**
   * Creates a traveller review and folds it into the tour aggregate atomically.
   * Eligibility is re-checked inside the transaction (the DB unique index on
   * `booking_id` is the final guard against double submits).
   */
  async create(user: { id: string; name: string }, input: CreateReviewInput) {
    const booking = await reviewRepository.findBookingForReview(input.bookingId);

    // Only photos this traveller uploaded for this booking can be linked.
    const uploads = input.photos ?? [];
    const signed = uploads.every(({ receipt, ...photo }) =>
      receiptMatches(
        reviewPhotoReceiptPayload({ userId: user.id, bookingId: input.bookingId, photo }),
        receipt,
      ),
    );
    const arranged = arrangeReviewPhotos(
      uploads.map(({ path, width, height }) => ({ path, width, height })),
    );
    if (!signed || !arranged.ok) throw new DomainError("forbidden");

    return db.transaction(async (tx) => {
      const alreadyReviewed = booking
        ? await reviewRepository.existsForBooking(tx, input.bookingId)
        : false;
      const verdict = reviewEligibility({ booking, userId: user.id, alreadyReviewed });
      if (verdict !== "ok" || !booking) throw new DomainError("forbidden");

      const aggregate = await reviewRepository.lockTourAggregate(tx, booking.tourId);
      if (!aggregate) throw new DomainError("notFound");

      const review = await reviewRepository.insert(tx, {
        tourId: booking.tourId,
        userId: user.id,
        bookingId: booking.id,
        authorName: user.name,
        country: input.country,
        rating: input.rating,
        body: { id: input.body, en: input.body },
        language: input.language,
      });

      await reviewRepository.insertPhotos(tx, review.id, arranged.photos);

      const next = applyReviewDelta(aggregate, input.rating, 1);
      await reviewRepository.updateTourAggregate(tx, booking.tourId, next.rating, next.count);
      return { review, tourSlug: aggregate.slug };
    });
  },

  /**
   * Stores a photo for a review the traveller is about to write. Only the
   * owner of a completed, not yet reviewed booking may upload. The file is
   * validated by content and re-encoded (WebP, longest edge 1600px); it is
   * not linked anywhere until the review is created with its receipt, so an
   * abandoned form leaves an unlisted file behind and nothing else.
   * Throws `ImageRejectedError` for files that aren't usable images.
   */
  async uploadPhoto(
    userId: string,
    bookingId: number,
    bytes: Uint8Array,
  ): Promise<ReviewPhotoUpload> {
    if ((await reviewService.eligibility(userId, bookingId)) !== "ok")
      throw new DomainError("forbidden");
    const stored = await storeImage(bytes, {
      folder: "reviews",
      maxWidth: REVIEW_PHOTO_MAX_EDGE,
      maxHeight: REVIEW_PHOTO_MAX_EDGE,
      quality: REVIEW_PHOTO_QUALITY,
    });
    const photo = { path: stored.url, width: stored.width, height: stored.height };
    return {
      ...photo,
      receipt: signReceipt(reviewPhotoReceiptPayload({ userId, bookingId, photo })),
    };
  },

  /** Public photos (published reviews, not hidden) grouped by review id. */
  async publicPhotosByReview(reviewIds: number[]): Promise<Map<number, PublicReviewPhoto[]>> {
    return groupByReview(await reviewRepository.publicPhotosForReviews(reviewIds));
  },

  /** Moderation view: every photo, hidden ones included, grouped by review id. */
  async photosByReview(reviewIds: number[]) {
    return groupByReview(await reviewRepository.photosForReviews(reviewIds));
  },

  /** Hides or shows one review photo; `changed` is false when it already was. */
  async setPhotoHidden(photoId: number, isHidden: boolean) {
    const before = await reviewRepository.findPhoto(photoId);
    if (!before) throw new DomainError("notFound");
    if (before.isHidden === isHidden) return { photo: before, changed: false };
    const photo = await reviewRepository.setPhotoHidden(photoId, isHidden);
    if (!photo) throw new DomainError("notFound");
    return { photo, changed: true };
  },

  /* -------------------------- admin -------------------------- */

  listAll: () => reviewRepository.listAll(),

  /** Admin moderation list, filtered and paginated in SQL. */
  listForAdmin(filters: AdminReviewFilters, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => reviewRepository.countAdmin(filters),
      load: (limit, offset) => reviewRepository.listAdmin(filters, limit, offset),
    });
  },

  /**
   * Saves the team's public reply (or removes it with `reply: null`). Editing
   * keeps the reply author and date current.
   */
  async setReply(reviewId: number, actorId: string, reply: string | null) {
    const before = await reviewRepository.findById(db, reviewId);
    if (!before) throw new DomainError("notFound");
    const review = await reviewRepository.setReply(
      reviewId,
      reply === null
        ? { reply: null, repliedAt: null, repliedBy: null }
        : { reply, repliedAt: new Date(), repliedBy: actorId },
    );
    if (!review) throw new DomainError("notFound");
    return { review, hadReply: before.reply !== null };
  },

  /** Hides or restores a review and adjusts the tour aggregate accordingly. */
  async setPublished(reviewId: number, isPublished: boolean) {
    return db.transaction(async (tx) => {
      const review = await reviewRepository.findById(tx, reviewId);
      if (!review) throw new DomainError("notFound");
      if (review.isPublished === isPublished) return { review, tourSlug: null };

      const aggregate = await reviewRepository.lockTourAggregate(tx, review.tourId);
      if (!aggregate) throw new DomainError("notFound");

      const updated = await reviewRepository.setPublished(tx, reviewId, isPublished);
      const next = applyReviewDelta(aggregate, review.rating, isPublished ? 1 : -1);
      await reviewRepository.updateTourAggregate(tx, review.tourId, next.rating, next.count);
      return { review: updated, tourSlug: aggregate.slug };
    });
  },
};
