import { describe, expect, it } from "vitest";
import { clampPage, offsetFor, pageCountFor, pageItems, paginate, parsePage } from "./pagination";

describe("parsePage", () => {
  it("accepts positive integers", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
    expect(parsePage(["3", "9"])).toBe(3);
  });

  it("falls back to 1 for anything else", () => {
    for (const raw of [undefined, "", "0", "-2", "1.5", "abc", "2e3", "9999999", " 2"]) {
      expect(parsePage(raw)).toBe(1);
    }
  });
});

describe("page math", () => {
  it("always has at least one page", () => {
    expect(pageCountFor(0, 12)).toBe(1);
    expect(pageCountFor(12, 12)).toBe(1);
    expect(pageCountFor(13, 12)).toBe(2);
  });

  it("clamps past-the-end pages to the last page", () => {
    expect(clampPage(5, 25, 12)).toBe(3);
    expect(clampPage(0, 25, 12)).toBe(1);
    expect(clampPage(2, 0, 12)).toBe(1);
  });

  it("computes offsets", () => {
    expect(offsetFor(1, 20)).toBe(0);
    expect(offsetFor(3, 20)).toBe(40);
  });
});

describe("paginate", () => {
  it("loads the clamped page and reports totals", async () => {
    const data = Array.from({ length: 25 }, (_, i) => i);
    const result = await paginate({
      page: 9,
      pageSize: 12,
      count: async () => data.length,
      load: async (limit, offset) => data.slice(offset, offset + limit),
    });
    expect(result).toMatchObject({ page: 3, pageCount: 3, total: 25, items: [24] });
  });

  it("skips loading when there is nothing to show", async () => {
    let loaded = false;
    const result = await paginate({
      page: 1,
      pageSize: 12,
      count: async () => 0,
      load: async () => {
        loaded = true;
        return [];
      },
    });
    expect(loaded).toBe(false);
    expect(result).toMatchObject({ items: [], page: 1, pageCount: 1 });
  });
});

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses gaps with ellipses around the current page", () => {
    expect(pageItems(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, "ellipsis", 12]);
    expect(pageItems(12, 12)).toEqual([1, "ellipsis", 11, 12]);
  });
});
