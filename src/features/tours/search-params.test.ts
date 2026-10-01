import { describe, expect, it } from "vitest";
import { parseTourSearch, toTourFilters } from "./search-params";

describe("parseTourSearch", () => {
  it("keeps valid params and coerces numbers", () => {
    expect(
      parseTourSearch({
        q: "  bromo ",
        category: "ritual",
        destination: "tengger-bromo",
        maxPrice: "2500000",
        maxDays: "2",
        sort: "priceAsc",
      }),
    ).toEqual({
      q: "bromo",
      category: "ritual",
      destination: "tengger-bromo",
      maxPrice: 2_500_000,
      maxDays: 2,
      sort: "priceAsc",
    });
  });

  it("drops each invalid param on its own without discarding the rest", () => {
    expect(
      parseTourSearch({
        q: "batik",
        category: "spaceflight",
        destination: "../etc",
        maxPrice: "abc",
        maxDays: "-1",
        sort: "random",
      }),
    ).toEqual({ q: "batik" });
  });

  it("uses the first value of repeated params and ignores empty search", () => {
    expect(parseTourSearch({ category: ["craft", "ritual"], q: "   " })).toEqual({
      category: "craft",
    });
  });

  it("rejects overly long queries and out-of-range numbers", () => {
    expect(parseTourSearch({ q: "x".repeat(81), maxDays: "61" })).toEqual({});
  });
});

describe("toTourFilters", () => {
  it("maps URL params to repository filters", () => {
    expect(toTourFilters({ destination: "ubud", sort: "duration" })).toEqual({
      query: undefined,
      category: undefined,
      destinationSlug: "ubud",
      maxPrice: undefined,
      maxDays: undefined,
      sort: "duration",
    });
  });
});
