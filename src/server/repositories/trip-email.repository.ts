import "server-only";
import { and, asc, between, eq, exists, isNull, not, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, destinations, reviews, tours, user } from "@/server/db/schema";

/** Date range (`YYYY-MM-DD`, inclusive) of travel dates a scheduled email covers. */
export type DateWindow = { from: string; to: string };

const hasReview = exists(
  db
    .select({ one: sql`1` })
    .from(reviews)
    .where(eq(reviews.bookingId, bookings.id)),
);

const reminderDue = (window: DateWindow) =>
  and(
    eq(bookings.status, "confirmed"),
    isNull(bookings.reminderSentAt),
    between(bookings.travelDate, window.from, window.to),
  );

const reviewRequestDue = (window: DateWindow) =>
  and(
    eq(bookings.status, "completed"),
    isNull(bookings.reviewRequestSentAt),
    between(bookings.travelDate, window.from, window.to),
    not(hasReview),
  );

/** Candidates whose owner can still sign in (disabled accounts get no mail). */
function candidates(where: ReturnType<typeof and>, limit: number) {
  return db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(user, eq(bookings.userId, user.id))
    .where(and(where, isNull(user.disabledAt)))
    .orderBy(asc(bookings.travelDate), asc(bookings.id))
    .limit(limit)
    .then((rows) => rows.map((row) => row.id));
}

/**
 * Queries for the scheduled trip emails. Each email is claimed with a single
 * conditional UPDATE before it is sent: only one concurrent run can flip the
 * `*_sent_at` column from NULL, so nobody gets the same email twice.
 */
export const tripEmailRepository = {
  reminderCandidates(window: DateWindow, limit: number) {
    return candidates(reminderDue(window), limit);
  },

  reviewRequestCandidates(window: DateWindow, limit: number) {
    return candidates(reviewRequestDue(window), limit);
  },

  /** True when this call claimed the reminder (the conditions are re-checked atomically). */
  claimReminder(bookingId: number, window: DateWindow) {
    return db
      .update(bookings)
      .set({ reminderSentAt: sql`now()` })
      .where(and(eq(bookings.id, bookingId), reminderDue(window)))
      .returning({ id: bookings.id })
      .then((rows) => rows.length > 0);
  },

  claimReviewRequest(bookingId: number, window: DateWindow) {
    return db
      .update(bookings)
      .set({ reviewRequestSentAt: sql`now()` })
      .where(and(eq(bookings.id, bookingId), reviewRequestDue(window)))
      .returning({ id: bookings.id })
      .then((rows) => rows.length > 0);
  },

  /** Undoes a claim when delivery failed, so the next run retries it. */
  releaseReminder(bookingId: number) {
    return db
      .update(bookings)
      .set({ reminderSentAt: null })
      .where(eq(bookings.id, bookingId))
      .then(() => undefined);
  },

  releaseReviewRequest(bookingId: number) {
    return db
      .update(bookings)
      .set({ reviewRequestSentAt: null })
      .where(eq(bookings.id, bookingId))
      .then(() => undefined);
  },

  /** Everything the trip emails show. */
  emailContext(bookingId: number) {
    return db
      .select({
        booking: {
          code: bookings.code,
          travelDate: bookings.travelDate,
          participants: bookings.participants,
          contactName: bookings.contactName,
          contactPhone: bookings.contactPhone,
        },
        tour: {
          title: tours.title,
          meetingPoint: tours.meetingPoint,
          whatToBring: tours.whatToBring,
          etiquette: tours.etiquette,
        },
        destination: destinations.name,
        recipient: { name: user.name, email: user.email, locale: user.locale },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(eq(bookings.id, bookingId))
      .limit(1)
      .then((rows) => rows[0]);
  },
};
