import { describe, expect, it } from "vitest";
import {
  averageGroupSize,
  barWidth,
  buildMonthSeries,
  buildTourRows,
  isIsoDate,
  jakartaToday,
  monthsInPeriod,
  percentOf,
  periodBounds,
  REPORT_MAX_DAYS,
  resolvePeriod,
} from "./report.rules";

const TODAY = "2026-03-15";

describe("resolvePeriod", () => {
  it("defaults to this month up to today", () => {
    expect(resolvePeriod({}, TODAY)).toEqual({
      preset: "this-month",
      from: "2026-03-01",
      to: TODAY,
    });
    expect(resolvePeriod({ period: "nonsense" }, TODAY).preset).toBe("this-month");
  });

  it("last month covers the whole previous calendar month", () => {
    expect(resolvePeriod({ period: "last-month" }, TODAY)).toEqual({
      preset: "last-month",
      from: "2026-02-01",
      to: "2026-02-28",
    });
    // January rolls back into December of the previous year.
    expect(resolvePeriod({ period: "last-month" }, "2026-01-10")).toMatchObject({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("last 90 days includes today", () => {
    expect(resolvePeriod({ period: "last-90" }, TODAY)).toMatchObject({
      from: "2025-12-16",
      to: TODAY,
    });
  });

  it("this year starts on 1 January", () => {
    expect(resolvePeriod({ period: "this-year" }, TODAY)).toMatchObject({
      from: "2026-01-01",
      to: TODAY,
    });
  });

  it("custom ranges are validated, swapped and clamped", () => {
    expect(
      resolvePeriod({ period: "custom", from: "2026-01-05", to: "2026-02-10" }, TODAY),
    ).toEqual({ preset: "custom", from: "2026-01-05", to: "2026-02-10" });
    expect(
      resolvePeriod({ period: "custom", from: "2026-02-10", to: "2026-01-05" }, TODAY),
    ).toMatchObject({ from: "2026-01-05", to: "2026-02-10" });
    expect(
      resolvePeriod({ period: "custom", from: "2026-02-30", to: "2026-03-01" }, TODAY).preset,
    ).toBe("this-month");
    const long = resolvePeriod({ period: "custom", from: "2000-01-01", to: "2026-01-01" }, TODAY);
    expect(long.to).toBe("2026-01-01");
    const days = (Date.parse(long.to) - Date.parse(long.from)) / 86_400_000 + 1;
    expect(days).toBe(REPORT_MAX_DAYS);
  });
});

describe("dates", () => {
  it("isIsoDate rejects impossible dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("26-2-1")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it("jakartaToday uses UTC+7", () => {
    // 18:30 UTC is already the next day in Jakarta.
    expect(jakartaToday(new Date("2026-03-15T18:30:00Z"))).toBe("2026-03-16");
    expect(jakartaToday(new Date("2026-03-15T16:59:00Z"))).toBe("2026-03-15");
  });

  it("periodBounds is a half-open Jakarta-day range", () => {
    const { start, end } = periodBounds({ from: "2026-03-01", to: "2026-03-31" });
    expect(start.toISOString()).toBe("2026-02-28T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-31T17:00:00.000Z");
  });

  it("monthsInPeriod lists every month across a year boundary", () => {
    expect(monthsInPeriod({ from: "2025-11-20", to: "2026-02-03" })).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(monthsInPeriod({ from: "2026-03-01", to: "2026-03-15" })).toEqual(["2026-03"]);
  });
});

describe("buildMonthSeries", () => {
  it("zero-fills months and nets refunds", () => {
    const rows = buildMonthSeries(
      { from: "2026-01-01", to: "2026-03-31" },
      {
        gross: [
          { month: "2026-01", amount: 1000 },
          { month: "2026-03", amount: 500 },
        ],
        refunds: [{ month: "2026-03", amount: 200 }],
        bookings: [{ month: "2026-02", bookings: 2, participants: 5 }],
      },
    );
    expect(rows).toEqual([
      { month: "2026-01", gross: 1000, refunds: 0, net: 1000, bookings: 0, participants: 0 },
      { month: "2026-02", gross: 0, refunds: 0, net: 0, bookings: 2, participants: 5 },
      { month: "2026-03", gross: 500, refunds: 200, net: 300, bookings: 0, participants: 0 },
    ]);
  });
});

describe("buildTourRows", () => {
  it("merges aggregates per tour and sorts by net revenue", () => {
    const titles = new Map([
      [1, "Bromo"],
      [2, "Ubud"],
      [3, "Toraja"],
    ]);
    const rows = buildTourRows(titles, {
      bookings: [
        { tourId: 1, bookings: 3, participants: 6 },
        { tourId: 2, bookings: 1, participants: 2 },
        { tourId: 99, bookings: 1, participants: 1 },
      ],
      gross: [
        { tourId: 1, amount: 300 },
        { tourId: 2, amount: 900 },
      ],
      refunds: [{ tourId: 2, amount: 100 }],
    });
    expect(rows.map((r) => r.title)).toEqual(["Ubud", "Bromo"]);
    expect(rows[0]).toMatchObject({ gross: 900, refunds: 100, net: 800, bookings: 1 });
    expect(rows[1]).toMatchObject({ net: 300, bookings: 3, participants: 6 });
  });
});

describe("number helpers", () => {
  it("averageGroupSize rounds to one decimal", () => {
    expect(averageGroupSize(3, 7)).toBe(2.3);
    expect(averageGroupSize(0, 0)).toBe(0);
  });

  it("percentOf and barWidth handle zero", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(1, 0)).toBe(0);
    expect(barWidth(0, 100)).toBe(0);
    expect(barWidth(50, 100)).toBe(50);
    expect(barWidth(1, 10_000)).toBe(2);
    expect(barWidth(5, 0)).toBe(0);
  });
});
