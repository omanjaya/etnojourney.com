import { describe, expect, it } from "vitest";
import { applyReviewDelta, reviewEligibility } from "./review.rules";

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

  it("reverses an addition when the review is hidden", () => {
    const added = applyReviewDelta({ rating: 4.5, count: 2 }, 2, 1);
    expect(added).toEqual({ rating: 3.7, count: 3 });
    const removed = applyReviewDelta(added, 2, -1);
    expect(removed.count).toBe(2);
    expect(removed.rating).toBeCloseTo(4.6, 5);
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
