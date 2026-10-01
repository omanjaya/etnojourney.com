import { describe, expect, it } from "vitest";
import { parseAdminBookingQuery, parseAdminListQuery } from "./schemas";

describe("parseAdminBookingQuery", () => {
  it("keeps valid params", () => {
    expect(
      parseAdminBookingQuery({
        q: "  EJ-ABC  ",
        status: "pending",
        from: "2026-10-01",
        to: "2026-12-31",
        sort: "travel",
      }),
    ).toEqual({
      q: "EJ-ABC",
      status: "pending",
      from: "2026-10-01",
      to: "2026-12-31",
      sort: "travel",
    });
  });

  it("drops invalid params individually", () => {
    expect(
      parseAdminBookingQuery({
        q: "nadia",
        status: "shipped",
        from: "2026-02-30",
        to: "tomorrow",
        sort: "price",
      }),
    ).toEqual({ q: "nadia" });
  });

  it("swaps a reversed date range and takes the first of repeated params", () => {
    expect(parseAdminBookingQuery({ from: "2026-12-01", to: "2026-10-01" })).toMatchObject({
      from: "2026-10-01",
      to: "2026-12-01",
    });
    expect(parseAdminBookingQuery({ status: ["confirmed", "pending"] })).toEqual({
      status: "confirmed",
    });
  });

  it("ignores empty or oversized search text", () => {
    expect(parseAdminBookingQuery({ q: "   " })).toEqual({});
    expect(parseAdminBookingQuery({ q: "x".repeat(101) })).toEqual({});
  });
});

describe("parseAdminListQuery", () => {
  it("reads q and ignores everything else", () => {
    expect(parseAdminListQuery({ q: "ubud", page: "2" })).toEqual({ q: "ubud" });
    expect(parseAdminListQuery({})).toEqual({});
  });
});
