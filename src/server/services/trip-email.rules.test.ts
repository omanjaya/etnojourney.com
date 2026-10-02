import { describe, expect, it } from "vitest";
import { daysUntil, tripEmailWindows } from "./trip-email.rules";

describe("tripEmailWindows", () => {
  it("covers today..+3 for reminders and -14..-1 for review requests", () => {
    // 10:00 in Jakarta (UTC+7).
    expect(tripEmailWindows(new Date("2026-10-02T03:00:00Z"))).toEqual({
      today: "2026-10-02",
      reminder: { from: "2026-10-02", to: "2026-10-05" },
      reviewRequest: { from: "2026-09-18", to: "2026-10-01" },
    });
  });

  it("uses the Jakarta date, not the server's (UTC) date", () => {
    // 23:30 UTC on Oct 1 is already 06:30 on Oct 2 in Jakarta.
    expect(tripEmailWindows(new Date("2026-10-01T23:30:00Z")).today).toBe("2026-10-02");
    // 16:59 UTC is 23:59 Jakarta, still the same day.
    expect(tripEmailWindows(new Date("2026-10-02T16:59:00Z")).today).toBe("2026-10-02");
    expect(tripEmailWindows(new Date("2026-10-02T17:00:00Z")).today).toBe("2026-10-03");
  });

  it("crosses month and year boundaries", () => {
    const windows = tripEmailWindows(new Date("2026-12-30T05:00:00Z"));
    expect(windows.reminder).toEqual({ from: "2026-12-30", to: "2027-01-02" });
    expect(tripEmailWindows(new Date("2027-01-05T05:00:00Z")).reviewRequest).toEqual({
      from: "2026-12-22",
      to: "2027-01-04",
    });
  });
});

describe("daysUntil", () => {
  it("counts whole calendar days", () => {
    expect(daysUntil("2026-10-02", "2026-10-02")).toBe(0);
    expect(daysUntil("2026-10-05", "2026-10-02")).toBe(3);
    expect(daysUntil("2026-09-30", "2026-10-02")).toBe(-2);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });
});
