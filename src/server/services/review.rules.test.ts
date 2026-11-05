import { describe, expect, it } from "vitest";
import {
  applyReviewDelta,
  arrangeReviewPhotos,
  isReviewPhotoPath,
  nextTourAggregate,
  REVIEW_PHOTOS_MAX,
  reviewEligibility,
  reviewPhotoReceiptPayload,
} from "./review.rules";

describe("reviewEligibility", () => {
  const booking = { userId: "u1", status: "completed" as const };

  it("allows the owner of a completed, unreviewed booking", () => {
    expect(reviewEligibility({ booking, userId: "u1", alreadyReviewed: false })).toBe("ok");
  });

  it("rejects missing bookings, other users, unfinished trips and duplicates", () => {
    expect(reviewEligibility({ booking: null, userId: "u1", alreadyReviewed: false })).toBe(
      "notFound",
    );
    expect(reviewEligibility({ booking, userId: "u2", alreadyReviewed: false })).toBe("notOwner");
    expect(
      reviewEligibility({
        booking: { ...booking, status: "confirmed" },
        userId: "u1",
        alreadyReviewed: false,
      }),
    ).toBe("notCompleted");
    expect(reviewEligibility({ booking, userId: "u1", alreadyReviewed: true })).toBe(
      "alreadyReviewed",
    );
  });
});

describe("applyReviewDelta", () => {
  it("adds a rating as a weighted average rounded to one decimal", () => {
    expect(applyReviewDelta({ rating: 4.8, count: 58 }, 3, 1)).toEqual({ rating: 4.8, count: 59 });
    expect(applyReviewDelta({ rating: 4.0, count: 1 }, 5, 1)).toEqual({ rating: 4.5, count: 2 });
  });

  it("starts from an empty aggregate", () => {
    expect(applyReviewDelta({ rating: 0, count: 0 }, 4, 1)).toEqual({ rating: 4, count: 1 });
  });

  it("reverses an addition exactly when the review is hidden", () => {
    const added = applyReviewDelta({ rating: 4.5, count: 2 }, 2, 1);
    expect(added).toEqual({ rating: 3.7, count: 3 });
    expect(applyReviewDelta(added, 2, -1)).toEqual({ rating: 4.5, count: 2 });
  });

  it("does not drift when low ratings are hidden one by one", () => {
    let aggregate = { rating: 0, count: 0 };
    for (const rating of [1, 1, 3]) aggregate = applyReviewDelta(aggregate, rating, 1);
    expect(aggregate).toEqual({ rating: 1.7, count: 3 });
    aggregate = applyReviewDelta(aggregate, 1, -1);
    expect(aggregate).toEqual({ rating: 2, count: 2 });
    expect(applyReviewDelta(aggregate, 1, -1)).toEqual({ rating: 3, count: 1 });
  });

  it("returns to the start after any hide and show cycle of up to 10 reviews", () => {
    const ratings = [5, 4, 4, 2, 5, 3, 1, 5, 4];
    let aggregate = { rating: 0, count: 0 };
    for (const rating of ratings) aggregate = applyReviewDelta(aggregate, rating, 1);
    const start = aggregate;
    for (const rating of ratings) {
      aggregate = applyReviewDelta(applyReviewDelta(aggregate, rating, -1), rating, 1);
    }
    expect(aggregate).toEqual(start);
  });

  it("resets to zero when the last review is removed", () => {
    expect(applyReviewDelta({ rating: 5, count: 1 }, 5, -1)).toEqual({ rating: 0, count: 0 });
    expect(applyReviewDelta({ rating: 0, count: 0 }, 5, -1)).toEqual({ rating: 0, count: 0 });
  });

  it("clamps into the 0..5 range", () => {
    expect(applyReviewDelta({ rating: 5, count: 2 }, 1, -1).rating).toBe(5);
    expect(applyReviewDelta({ rating: 1, count: 2 }, 5, -1).rating).toBe(0);
  });
});

describe("nextTourAggregate", () => {
  it("recomputes from the published reviews when they are all the tour has", () => {
    // Ratings 1, 1, 3; both 1-star reviews hidden: only the 3 is left.
    expect(
      nextTourAggregate({
        current: { rating: 1.7, count: 3 },
        rating: 1,
        direction: -1,
        published: { sum: 4, count: 2 },
      }),
    ).toEqual({ rating: 2, count: 2 });
    expect(
      nextTourAggregate({
        current: { rating: 2.1, count: 2 },
        rating: 1,
        direction: -1,
        published: { sum: 3, count: 1 },
      }),
    ).toEqual({ rating: 3, count: 1 });
  });

  it("repairs a drifted rating on the next change", () => {
    expect(
      nextTourAggregate({
        current: { rating: 3.2, count: 1 },
        rating: 5,
        direction: 1,
        published: { sum: 8, count: 2 },
      }),
    ).toEqual({ rating: 4, count: 2 });
  });

  it("adds the first review and empties the aggregate when the last one is hidden", () => {
    expect(
      nextTourAggregate({
        current: { rating: 0, count: 0 },
        rating: 4,
        direction: 1,
        published: { sum: 4, count: 1 },
      }),
    ).toEqual({ rating: 4, count: 1 });
    expect(
      nextTourAggregate({
        current: { rating: 4, count: 1 },
        rating: 4,
        direction: -1,
        published: { sum: 0, count: 0 },
      }),
    ).toEqual({ rating: 0, count: 0 });
  });

  it("keeps a curated history (more reviews counted than rows) and applies the delta", () => {
    expect(
      nextTourAggregate({
        current: { rating: 4.9, count: 128 },
        rating: 3,
        direction: 1,
        published: { sum: 13, count: 3 },
      }),
    ).toEqual(applyReviewDelta({ rating: 4.9, count: 128 }, 3, 1));
  });
});

describe("review photos", () => {
  const path = (n: number) =>
    `/media/reviews/2026/10/00000000-0000-4000-8000-${String(n).padStart(12, "0")}.webp`;
  const photo = (n: number) => ({ path: path(n), width: 1600, height: 1200 });

  it("accepts only review upload paths", () => {
    expect(isReviewPhotoPath(path(1))).toBe(true);
    for (const value of [
      "/media/tours/2026/10/00000000-0000-4000-8000-000000000001.webp",
      "/media/reviews/2026/10/../../tours/x.webp",
      "https://evil.test/media/reviews/2026/10/00000000-0000-4000-8000-000000000001.webp",
      "/media/reviews/2026/10/00000000-0000-4000-8000-000000000001.png",
      "/images/content/bali/kecak.webp",
    ]) {
      expect(isReviewPhotoPath(value), value).toBe(false);
    }
  });

  it("assigns positions 0..n-1 in submission order and drops duplicates", () => {
    const result = arrangeReviewPhotos([photo(3), photo(1), photo(3), photo(2)]);
    expect(result).toEqual({
      ok: true,
      photos: [
        { ...photo(3), position: 0 },
        { ...photo(1), position: 1 },
        { ...photo(2), position: 2 },
      ],
    });
    expect(arrangeReviewPhotos([])).toEqual({ ok: true, photos: [] });
  });

  it(`allows at most ${REVIEW_PHOTOS_MAX} photos`, () => {
    const four = [1, 2, 3, 4].map(photo);
    const arranged = arrangeReviewPhotos(four);
    expect(arranged.ok && arranged.photos.map((p) => p.position)).toEqual([0, 1, 2, 3]);
    expect(arrangeReviewPhotos([...four, photo(5)])).toEqual({ ok: false, problem: "tooMany" });
  });

  it("rejects foreign paths and bad dimensions", () => {
    expect(arrangeReviewPhotos([{ ...photo(1), path: "/media/tours/x.webp" }])).toEqual({
      ok: false,
      problem: "invalid",
    });
    expect(arrangeReviewPhotos([{ ...photo(1), width: 0 }])).toEqual({
      ok: false,
      problem: "invalid",
    });
    expect(arrangeReviewPhotos([{ ...photo(1), height: 1.5 }])).toEqual({
      ok: false,
      problem: "invalid",
    });
  });

  it("binds receipts to the traveller, the booking and the exact file", () => {
    const base = reviewPhotoReceiptPayload({ userId: "u1", bookingId: 7, photo: photo(1) });
    expect(reviewPhotoReceiptPayload({ userId: "u2", bookingId: 7, photo: photo(1) })).not.toBe(
      base,
    );
    expect(reviewPhotoReceiptPayload({ userId: "u1", bookingId: 8, photo: photo(1) })).not.toBe(
      base,
    );
    expect(reviewPhotoReceiptPayload({ userId: "u1", bookingId: 7, photo: photo(2) })).not.toBe(
      base,
    );
    expect(
      reviewPhotoReceiptPayload({ userId: "u1", bookingId: 7, photo: { ...photo(1), width: 9 } }),
    ).not.toBe(base);
  });
});
