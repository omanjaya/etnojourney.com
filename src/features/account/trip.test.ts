import { describe, expect, it } from "vitest";
import { daysBetween, pickNextTrip } from "./trip";

const row = (
  code: string,
  status: "pending" | "confirmed" | "cancelled" | "completed",
  travelDate: string,
) => ({
  code,
  booking: { status, travelDate },
});

describe("pickNextTrip", () => {
  it("picks the soonest upcoming booking that is still going ahead", () => {
    const rows = [
      row("later", "confirmed", "2026-12-01"),
      row("cancelled", "cancelled", "2026-10-05"),
      row("past", "confirmed", "2026-09-30"),
      row("soonest", "pending", "2026-10-20"),
      row("done", "completed", "2026-10-03"),
    ];
    expect(pickNextTrip(rows, "2026-10-02")?.code).toBe("soonest");
  });

  it("includes a trip that starts today and returns nothing when none qualify", () => {
    expect(pickNextTrip([row("today", "confirmed", "2026-10-02")], "2026-10-02")?.code).toBe(
      "today",
    );
    expect(pickNextTrip([row("x", "cancelled", "2026-11-01")], "2026-10-02")).toBeUndefined();
  });
});

describe("daysBetween", () => {
  it("counts calendar days across months and years", () => {
    expect(daysBetween("2026-10-02", "2026-11-30")).toBe(59);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-10-02", "2026-10-02")).toBe(0);
  });
});
