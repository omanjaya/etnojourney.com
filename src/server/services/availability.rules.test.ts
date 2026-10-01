import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  buildMonthAvailability,
  dayState,
  daysInMonth,
  isLimited,
  isMonthInRange,
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
