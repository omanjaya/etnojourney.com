import { describe, expect, it } from "vitest";
import { bucketForMaxDays, parseTourSearch, toTourFilters } from "./search-params";

describe("parseTourSearch", () => {
  it("keeps valid params and coerces numbers", () => {
    expect(
      parseTourSearch({
        q: "  bromo ",
        category: "ritual",
        destination: "tengger-bromo",
        maxPrice: "2500000",
        duration: "2-3",
        island: "jawa",
        sort: "priceAsc",
      }),
    ).toEqual({
      q: "bromo",
      category: "ritual",
      island: "jawa",
      destination: "tengger-bromo",
      maxPrice: 2_500_000,
      duration: "2-3",
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
        duration: "7",
        island: "atlantis",
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
    expect(parseTourSearch({ q: "x".repeat(81), maxDays: "61", island: "other" })).toEqual({});
  });
});

describe("legacy maxDays links", () => {
  it("map onto the closest duration bucket", () => {
    expect(bucketForMaxDays(1)).toBe("1");
    expect(bucketForMaxDays(2)).toBe("2-3");
    expect(bucketForMaxDays(3)).toBe("2-3");
    expect(bucketForMaxDays(5)).toBe("4+");
    expect(parseTourSearch({ maxDays: "2" })).toEqual({ duration: "2-3" });
  });

  it("prefer an explicit duration over maxDays", () => {
    expect(parseTourSearch({ maxDays: "1", duration: "4+" })).toEqual({ duration: "4+" });
  });
});

describe("toTourFilters", () => {
  it("maps URL params to repository filters", () => {
    expect(toTourFilters({ destination: "ubud", sort: "longest", island: "bali" })).toEqual({
      query: undefined,
      category: undefined,
      island: "bali",
      destinationSlug: "ubud",
      maxPrice: undefined,
      minDays: undefined,
      maxDays: undefined,
      sort: "longest",
    });
  });

  it("turns duration buckets into day ranges", () => {
    expect(toTourFilters({ duration: "1" })).toMatchObject({ minDays: 1, maxDays: 1 });
    expect(toTourFilters({ duration: "2-3" })).toMatchObject({ minDays: 2, maxDays: 3 });
    expect(toTourFilters({ duration: "4+" })).toMatchObject({ minDays: 4, maxDays: undefined });
  });
});
