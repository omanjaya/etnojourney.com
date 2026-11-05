import { describe, expect, it } from "vitest";
import { formatDate, isoDateFromToday } from "./format";

describe("isoDateFromToday", () => {
  it("uses the Jakarta calendar day, not the host's", () => {
    // 20:30 UTC on 2 Oct is already 03:30 on 3 Oct in Jakarta (UTC+7).
    const lateUtc = new Date("2026-10-02T20:30:00Z");
    expect(isoDateFromToday(0, lateUtc)).toBe("2026-10-03");
    expect(isoDateFromToday(3, lateUtc)).toBe("2026-10-06");
  });

  it("stays on the same day before Jakarta midnight", () => {
    expect(isoDateFromToday(0, new Date("2026-10-02T16:59:00Z"))).toBe("2026-10-02");
  });

  it("rolls over month and year boundaries", () => {
    expect(isoDateFromToday(1, new Date("2026-12-31T05:00:00Z"))).toBe("2027-01-01");
    expect(isoDateFromToday(-1, new Date("2026-03-01T05:00:00Z"))).toBe("2026-02-28");
  });
});

describe("formatDate", () => {
  it("renders calendar dates without shifting the day", () => {
    expect(formatDate("2026-10-15", "en")).toBe("October 15, 2026");
    expect(formatDate("2026-10-15", "id")).toBe("15 Oktober 2026");
  });

  it("renders instants in Jakarta time", () => {
    // 18:00 UTC on 14 Oct is 15 Oct in Jakarta.
    expect(formatDate(new Date("2026-10-14T18:00:00Z"), "en")).toBe("October 15, 2026");
  });
});
