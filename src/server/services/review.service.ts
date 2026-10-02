import "server-only";
import { db } from "@/server/db";
import type { Locale } from "@/i18n/routing";
import { paginate } from "@/lib/pagination";
import { reviewRepository, type AdminReviewFilters } from "@/server/repositories/review.repository";
import { DomainError } from "./errors";
import { applyReviewDelta, reviewEligibility, type ReviewEligibility } from "./review.rules";

export type CreateReviewInput = {
  bookingId: number;
  rating: number;
  body: string;
  country: string;
  language: Locale;
};

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

      const next = applyReviewDelta(aggregate, input.rating, 1);
      await reviewRepository.updateTourAggregate(tx, booking.tourId, next.rating, next.count);
      return { review, tourSlug: aggregate.slug };
    });
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
