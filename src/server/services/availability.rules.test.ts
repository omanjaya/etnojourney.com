import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  buildAdminMonth,
  buildMonthAvailability,
  closedDatesFor,
  closureRangeIssue,
  dateRange,
  dayState,
  daysInclusive,
  daysInMonth,
  groupClosures,
  isClosedOn,
  isLimited,
  isMonthInRange,
  isSelectable,
  lastClosableDate,
  MAX_CLOSURE_DAYS,
  mondayIndex,
} from "./availability.rules";

describe("calendar arithmetic", () => {
  it("handles month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("lists every day of a month, including leap February", () => {
    expect(daysInMonth("2026-02")).toHaveLength(28);
    expect(daysInMonth("2028-02")).toHaveLength(29);
    expect(daysInMonth("2026-10")[0]).toBe("2026-10-01");
    expect(daysInMonth("2026-10").at(-1)).toBe("2026-10-31");
  });

  it("indexes weekdays Monday-first", () => {
    expect(mondayIndex("2026-10-05")).toBe(0); // Monday
    expect(mondayIndex("2026-10-04")).toBe(6); // Sunday
  });

  it("allows the current month through twelve months ahead", () => {
    expect(isMonthInRange("2026-10", "2026-10-20")).toBe(true);
    expect(isMonthInRange("2027-10", "2026-10-20")).toBe(true);
    expect(isMonthInRange("2027-11", "2026-10-20")).toBe(false);
    expect(isMonthInRange("2026-09", "2026-10-20")).toBe(false);
  });
});

describe("day state", () => {
  const today = "2026-10-01";
  const state = (date: string, seatsLeft = 10, capacity = 10) =>
    dayState({ date, today, seatsLeft, capacity });

  it("marks past dates and dates inside the lead time", () => {
    expect(state("2026-09-30")).toBe("past");
    expect(state("2026-10-01")).toBe("tooSoon");
    expect(state("2026-10-03")).toBe("tooSoon");
    expect(state("2026-10-04")).toBe("available");
  });

  it("applies the lead time across a month boundary", () => {
    expect(dayState({ date: "2026-11-02", today: "2026-10-31", seatsLeft: 5, capacity: 5 })).toBe(
      "tooSoon",
    );
    expect(dayState({ date: "2026-11-03", today: "2026-10-31", seatsLeft: 5, capacity: 5 })).toBe(
      "available",
    );
  });

  it("distinguishes full, limited and available", () => {
    expect(state("2026-10-10", 0)).toBe("full");
    expect(state("2026-10-10", 2)).toBe("limited");
    expect(state("2026-10-10", 3)).toBe("available");
  });

  it("uses a quarter of the capacity as the limited threshold for large groups", () => {
    expect(isLimited(5, 20)).toBe(true);
    expect(isLimited(6, 20)).toBe(false);
    expect(isLimited(2, 6)).toBe(true);
    expect(isLimited(0, 6)).toBe(false);
  });
});

describe("buildMonthAvailability", () => {
  it("subtracts taken seats and hides seat counts for unbookable dates", () => {
    const result = buildMonthAvailability({
      month: "2026-10",
      today: "2026-10-01",
      capacity: 8,
      taken: new Map([
        ["2026-10-02", 3],
        ["2026-10-10", 8],
        ["2026-10-11", 7],
        ["2026-10-12", 20],
      ]),
    });
    const byDate = Object.fromEntries(result.days.map((d) => [d.date, d]));
    expect(result.days).toHaveLength(31);
    expect(byDate["2026-10-02"]).toEqual({ date: "2026-10-02", state: "tooSoon", seatsLeft: 0 });
    expect(byDate["2026-10-10"]).toMatchObject({ state: "full", seatsLeft: 0 });
    expect(byDate["2026-10-11"]).toMatchObject({ state: "limited", seatsLeft: 1 });
    expect(byDate["2026-10-12"]).toMatchObject({ state: "full", seatsLeft: 0 });
    expect(byDate["2026-10-20"]).toMatchObject({ state: "available", seatsLeft: 8 });
  });
});

describe("closures", () => {
  const closures = [
    { tourId: 7, date: "2026-10-10" },
    { tourId: null, date: "2026-10-17" },
    { tourId: 8, date: "2026-10-20" },
  ];

  it("applies a tour closure and an all-tours closure, but not another tour's", () => {
    expect(isClosedOn(closures, 7, "2026-10-10")).toBe(true);
    expect(isClosedOn(closures, 7, "2026-10-17")).toBe(true);
    expect(isClosedOn(closures, 8, "2026-10-17")).toBe(true);
    expect(isClosedOn(closures, 7, "2026-10-20")).toBe(false);
    expect(isClosedOn(closures, 8, "2026-10-10")).toBe(false);
    expect([...closedDatesFor(closures, 7)].sort()).toEqual(["2026-10-10", "2026-10-17"]);
  });

  it("makes a closed date unselectable, ahead of full, but never hides the past", () => {
    const today = "2026-10-01";
    expect(dayState({ date: "2026-10-10", today, seatsLeft: 5, capacity: 5, closed: true })).toBe(
      "closed",
    );
    expect(dayState({ date: "2026-10-10", today, seatsLeft: 0, capacity: 5, closed: true })).toBe(
      "closed",
    );
    expect(dayState({ date: "2026-10-02", today, seatsLeft: 5, capacity: 5, closed: true })).toBe(
      "closed",
    );
    expect(dayState({ date: "2026-09-30", today, seatsLeft: 5, capacity: 5, closed: true })).toBe(
      "past",
    );
    expect(isSelectable("closed")).toBe(false);
  });

  it("marks closed dates in the public month view with no seats", () => {
    const result = buildMonthAvailability({
      month: "2026-10",
      today: "2026-10-01",
      capacity: 8,
      taken: new Map([["2026-10-11", 3]]),
      closed: closedDatesFor(closures, 7),
    });
    const byDate = Object.fromEntries(result.days.map((d) => [d.date, d]));
    expect(byDate["2026-10-10"]).toEqual({ date: "2026-10-10", state: "closed", seatsLeft: 0 });
    expect(byDate["2026-10-17"]).toMatchObject({ state: "closed", seatsLeft: 0 });
    expect(byDate["2026-10-20"]).toMatchObject({ state: "available", seatsLeft: 8 });
    expect(byDate["2026-10-11"]).toMatchObject({ state: "available", seatsLeft: 5 });
  });

  it("expands inclusive ranges across month boundaries", () => {
    expect(dateRange("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(dateRange("2026-10-05", "2026-10-05")).toEqual(["2026-10-05"]);
    expect(dateRange("2026-10-05", "2026-10-04")).toEqual([]);
    expect(daysInclusive("2026-10-01", "2026-12-31")).toBe(92);
  });

  it("rejects past, backwards, too long and too far ranges", () => {
    const today = "2026-10-02";
    const issue = (from: string, to: string) => closureRangeIssue({ from, to, today });
    expect(issue("2026-10-02", "2026-10-02")).toBeNull();
    expect(issue("2026-10-01", "2026-10-05")).toBe("closurePast");
    expect(issue("2026-10-10", "2026-10-09")).toBe("closureRange");
    expect(issue("2026-10-02", addDays("2026-10-02", MAX_CLOSURE_DAYS - 1))).toBeNull();
    expect(issue("2026-10-02", addDays("2026-10-02", MAX_CLOSURE_DAYS))).toBe("closureTooLong");
    expect(lastClosableDate(today)).toBe("2027-10-31");
    expect(issue("2027-10-31", "2027-10-31")).toBeNull();
    expect(issue("2027-11-01", "2027-11-01")).toBe("closureTooFar");
  });

  it("groups consecutive closures that share tour, reason and author", () => {
    const row = (
      id: number,
      tourId: number | null,
      date: string,
      reason: string | null = "Nyepi",
    ) => ({
      id,
      tourId,
      date,
      reason,
      createdBy: "admin",
    });
    const groups = groupClosures([
      row(3, null, "2026-10-12"),
      row(1, null, "2026-10-10"),
      row(2, null, "2026-10-11"),
      row(4, null, "2026-10-14"),
      row(5, 7, "2026-10-11"),
      row(6, null, "2026-10-15", "Road works"),
    ]);
    expect(groups.map((g) => [g.from, g.to, g.rows.map((r) => r.id)])).toEqual([
      ["2026-10-10", "2026-10-12", [1, 2, 3]],
      ["2026-10-11", "2026-10-11", [5]],
      ["2026-10-14", "2026-10-14", [4]],
      ["2026-10-15", "2026-10-15", [6]],
    ]);
  });

  it("builds the back-office month for a tour and for all tours", () => {
    const rows = [
      { id: 1, tourId: 7, date: "2026-10-10", reason: "Guide on leave", createdBy: "a" },
      { id: 2, tourId: null, date: "2026-10-17", reason: null, createdBy: "a" },
      { id: 3, tourId: 8, date: "2026-10-17", reason: null, createdBy: "a" },
    ];
    const load = new Map([["2026-10-10", { seats: 4, bookings: 2 }]]);

    const tour = buildAdminMonth({
      month: "2026-10",
      today: "2026-10-05",
      tourId: 7,
      capacity: 8,
      load,
      closures: rows.filter((r) => r.tourId === 7 || r.tourId === null),
    });
    const t = Object.fromEntries(tour.map((d) => [d.date, d]));
    expect(t["2026-10-01"].past).toBe(true);
    expect(t["2026-10-10"]).toMatchObject({
      seats: 4,
      bookings: 2,
      capacity: 8,
      closure: { id: 1, reason: "Guide on leave" },
      closedForAll: false,
    });
    expect(t["2026-10-17"]).toMatchObject({ closure: null, closedForAll: true, toursClosed: 0 });

    const all = buildAdminMonth({
      month: "2026-10",
      today: "2026-10-05",
      tourId: null,
      capacity: null,
      load,
      closures: rows,
    });
    const a = Object.fromEntries(all.map((d) => [d.date, d]));
    expect(a["2026-10-17"]).toMatchObject({
      closure: { id: 2 },
      closedForAll: false,
      toursClosed: 1,
    });
    expect(a["2026-10-10"]).toMatchObject({ closure: null, toursClosed: 1, capacity: null });
  });
});
