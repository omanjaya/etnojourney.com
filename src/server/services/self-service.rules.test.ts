import { describe, expect, it } from "vitest";
import { cancellationPolicy } from "@/config/cancellation";
import {
  businessToday,
  canTravellerCancel,
  canTravellerReschedule,
  cancelBlocker,
  cancelOption,
  daysBefore,
  newDateIssue,
  refundAmountFor,
  refundPercentFor,
  refundQuote,
  rescheduleBlocker,
  tierRanges,
  type SelfServiceBooking,
  type SelfServicePolicy,
} from "./self-service.rules";

/** Fixed policy so the tests don't move when the business changes the defaults. */
const policy: SelfServicePolicy = {
  refundTiers: [
    { minDaysBefore: 14, percent: 100 },
    { minDaysBefore: 7, percent: 50 },
    { minDaysBefore: 0, percent: 0 },
  ],
  maxReschedules: 1,
  rescheduleMinDaysBefore: 3,
};

const TODAY = "2026-10-02";

const booking = (overrides: Partial<SelfServiceBooking> = {}): SelfServiceBooking => ({
  status: "confirmed",
  travelDate: "2026-10-20",
  rescheduleCount: 0,
  ...overrides,
});

describe("daysBefore", () => {
  it("counts whole calendar days", () => {
    expect(daysBefore("2026-10-02", TODAY)).toBe(0);
    expect(daysBefore("2026-10-16", TODAY)).toBe(14);
    expect(daysBefore("2026-10-01", TODAY)).toBe(-1);
  });

  it("crosses months, years and leap days", () => {
    expect(daysBefore("2026-11-01", "2026-10-31")).toBe(1);
    expect(daysBefore("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysBefore("2028-03-01", "2028-02-28")).toBe(2);
  });
});

describe("businessToday", () => {
  it("uses the Asia/Jakarta date, not UTC", () => {
    // 18:00 UTC on 1 Oct is 01:00 on 2 Oct in Jakarta (UTC+7).
    expect(businessToday(new Date("2026-10-01T18:00:00Z"))).toBe("2026-10-02");
    // 16:59 UTC is still 23:59 on the same day in Jakarta.
    expect(businessToday(new Date("2026-10-01T16:59:00Z"))).toBe("2026-10-01");
  });

  it("moves a cancellation into a lower tier right after Jakarta midnight", () => {
    const travel = "2026-10-15";
    const beforeMidnight = businessToday(new Date("2026-10-01T16:59:00Z"));
    const afterMidnight = businessToday(new Date("2026-10-01T17:00:00Z"));
    expect(refundPercentFor(daysBefore(travel, beforeMidnight), policy)).toBe(100);
    expect(refundPercentFor(daysBefore(travel, afterMidnight), policy)).toBe(50);
  });
});

describe("refundPercentFor", () => {
  it.each([
    [60, 100],
    [14, 100],
    [13, 50],
    [7, 50],
    [6, 0],
    [0, 0],
  ])("%i days before travel -> %i%%", (days, percent) => {
    expect(refundPercentFor(days, policy)).toBe(percent);
  });

  it("gives nothing once the travel date has passed", () => {
    expect(refundPercentFor(-1, policy)).toBe(0);
  });

  it("does not depend on the order the tiers are listed in", () => {
    const shuffled = { ...policy, refundTiers: [...policy.refundTiers].reverse() };
    expect(refundPercentFor(10, shuffled)).toBe(50);
    expect(refundPercentFor(20, shuffled)).toBe(100);
  });

  it("clamps out-of-range percentages", () => {
    const odd = { ...policy, refundTiers: [{ minDaysBefore: 0, percent: 150 }] };
    expect(refundPercentFor(3, odd)).toBe(100);
  });

  it("uses the shipped config by default", () => {
    const top = Math.max(...cancellationPolicy.refundTiers.map((t) => t.minDaysBefore));
    const expected = cancellationPolicy.refundTiers.find((t) => t.minDaysBefore === top)!.percent;
    expect(refundPercentFor(top)).toBe(expected);
  });
});

describe("refundAmountFor", () => {
  it("returns the whole amount for a full refund", () => {
    expect(refundAmountFor(1_400_000, 20, policy)).toBe(1_400_000);
  });

  it("halves in the 50% tier", () => {
    expect(refundAmountFor(1_400_000, 10, policy)).toBe(700_000);
  });

  it("rounds down to a whole rupiah", () => {
    expect(refundAmountFor(1_234_567, 10, policy)).toBe(617_283);
    const third = { ...policy, refundTiers: [{ minDaysBefore: 0, percent: 33 }] };
    expect(refundAmountFor(100_001, 5, third)).toBe(33_000);
  });

  it("is zero inside the no-refund window", () => {
    expect(refundAmountFor(1_400_000, 3, policy)).toBe(0);
  });

  it("never goes negative", () => {
    expect(refundAmountFor(-5, 20, policy)).toBe(0);
  });
});

describe("refundQuote", () => {
  it("stores null for a full refund", () => {
    expect(refundQuote(900_000, "2026-10-20", TODAY, policy)).toEqual({
      daysBefore: 18,
      percent: 100,
      amount: 900_000,
      refundable: true,
      storedAmount: null,
    });
  });

  it("stores the computed amount for a partial refund", () => {
    expect(refundQuote(900_001, "2026-10-12", TODAY, policy)).toEqual({
      daysBefore: 10,
      percent: 50,
      amount: 450_000,
      refundable: true,
      storedAmount: 450_000,
    });
  });

  it("is not refundable inside the no-refund window", () => {
    const quote = refundQuote(900_000, "2026-10-05", TODAY, policy);
    expect(quote.refundable).toBe(false);
    expect(quote.amount).toBe(0);
    expect(quote.percent).toBe(0);
  });
});

describe("canTravellerCancel", () => {
  it("allows pending and confirmed bookings up to the travel date", () => {
    expect(canTravellerCancel(booking(), TODAY)).toBe(true);
    expect(canTravellerCancel(booking({ status: "pending" }), TODAY)).toBe(true);
    expect(canTravellerCancel(booking({ travelDate: TODAY }), TODAY)).toBe(true);
  });

  it("refuses finished or cancelled bookings", () => {
    expect(cancelBlocker(booking({ status: "cancelled" }), TODAY)).toBe("status");
    expect(cancelBlocker(booking({ status: "completed" }), TODAY)).toBe("status");
  });

  it("refuses once the travel date has passed", () => {
    expect(cancelBlocker(booking({ travelDate: "2026-10-01" }), TODAY)).toBe("past");
    expect(canTravellerCancel(booking({ travelDate: "2026-10-01" }), TODAY)).toBe(false);
  });
});

describe("canTravellerReschedule", () => {
  it("allows a first move well ahead of the trip", () => {
    expect(canTravellerReschedule(booking(), TODAY, policy)).toBe(true);
    expect(canTravellerReschedule(booking({ status: "pending" }), TODAY, policy)).toBe(true);
  });

  it("closes exactly rescheduleMinDaysBefore days before travel", () => {
    expect(canTravellerReschedule(booking({ travelDate: "2026-10-05" }), TODAY, policy)).toBe(true);
    expect(rescheduleBlocker(booking({ travelDate: "2026-10-04" }), TODAY, policy)).toBe("tooLate");
  });

  it("caps the number of moves", () => {
    expect(rescheduleBlocker(booking({ rescheduleCount: 1 }), TODAY, policy)).toBe("limit");
    const twice = { ...policy, maxReschedules: 2 };
    expect(canTravellerReschedule(booking({ rescheduleCount: 1 }), TODAY, twice)).toBe(true);
  });

  it("refuses cancelled and completed bookings", () => {
    expect(rescheduleBlocker(booking({ status: "cancelled" }), TODAY, policy)).toBe("status");
    expect(rescheduleBlocker(booking({ status: "completed" }), TODAY, policy)).toBe("status");
  });
});

describe("newDateIssue", () => {
  it("accepts a different date after the lead time", () => {
    expect(newDateIssue("2026-10-20", "2026-11-03", TODAY)).toBeNull();
    expect(newDateIssue("2026-10-20", "2026-10-05", TODAY)).toBeNull();
  });

  it("refuses the current date", () => {
    expect(newDateIssue("2026-10-20", "2026-10-20", TODAY)).toBe("sameDate");
  });

  it("refuses dates inside the booking lead time", () => {
    expect(newDateIssue("2026-10-20", "2026-10-04", TODAY)).toBe("tooSoon");
    expect(newDateIssue("2026-10-20", "2026-09-30", TODAY)).toBe("tooSoon");
  });

  it("refuses dates beyond the bookable window", () => {
    expect(newDateIssue("2026-10-20", "2027-10-31", TODAY)).toBeNull();
    expect(newDateIssue("2026-10-20", "2027-11-01", TODAY)).toBe("tooFar");
  });
});

describe("tierRanges", () => {
  it("turns the tiers into day ranges, most days first", () => {
    expect(tierRanges(policy)).toEqual([
      { from: 14, to: null, percent: 100 },
      { from: 7, to: 13, percent: 50 },
      { from: 0, to: 6, percent: 0 },
    ]);
  });

  it("covers every day from 0 upwards without gaps for the shipped config", () => {
    const ranges = tierRanges();
    expect(ranges.at(-1)!.from).toBe(0);
    expect(ranges[0].to).toBeNull();
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].to).toBe(ranges[i - 1].from - 1);
  });
});

describe("cancelOption", () => {
  it("lets an unpaid pending booking go for free, whatever the date", () => {
    expect(cancelOption(booking({ status: "pending" }), null, TODAY, policy)).toEqual({
      kind: "free",
    });
    expect(
      cancelOption(booking({ status: "pending", travelDate: "2026-09-01" }), null, TODAY, policy),
    ).toEqual({ kind: "free" });
  });

  it("does not let an unpaid confirmed booking be cancelled by the traveller", () => {
    expect(cancelOption(booking({ status: "confirmed" }), null, TODAY, policy)).toBeNull();
  });

  it("quotes the refund for a paid booking", () => {
    const option = cancelOption(booking({ travelDate: "2026-10-12" }), 1_000_000, TODAY, policy);
    expect(option).toMatchObject({ kind: "paid", quote: { percent: 50, amount: 500_000 } });
  });

  it("refuses a paid booking whose date has passed or that is finished", () => {
    expect(cancelOption(booking({ travelDate: "2026-10-01" }), 1_000, TODAY, policy)).toBeNull();
    expect(cancelOption(booking({ status: "completed" }), 1_000, TODAY, policy)).toBeNull();
  });
});
