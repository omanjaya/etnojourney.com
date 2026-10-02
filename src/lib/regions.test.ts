import { describe, expect, it } from "vitest";
import { groupByIsland, islandOf } from "./regions";

describe("islandOf", () => {
  it("maps provinces to islands, including ones not in the catalogue yet", () => {
    expect(islandOf("Bali")).toBe("bali");
    expect(islandOf("Nusa Tenggara Timur")).toBe("nusa-tenggara");
    expect(islandOf("Nusa Tenggara Barat")).toBe("nusa-tenggara");
    expect(islandOf("DI Yogyakarta")).toBe("jawa");
    expect(islandOf("Jawa Timur")).toBe("jawa");
    expect(islandOf("Sumatera Barat")).toBe("sumatra");
    expect(islandOf("Kepulauan Riau")).toBe("sumatra");
    expect(islandOf("Kalimantan Barat")).toBe("kalimantan");
    expect(islandOf("Gorontalo")).toBe("sulawesi");
    expect(islandOf("Papua Pegunungan")).toBe("maluku-papua");
    expect(islandOf("Maluku Utara")).toBe("maluku-papua");
    expect(islandOf("Atlantis")).toBe("other");
  });
});

describe("groupByIsland", () => {
  it("keeps geographic order and drops empty groups", () => {
    const groups = groupByIsland(
      [{ p: "Maluku" }, { p: "Bali" }, { p: "Jawa Barat" }, { p: "Bali" }],
      (x) => x.p,
    );
    expect(groups.map((g) => [g.island, g.items.length])).toEqual([
      ["bali", 2],
      ["jawa", 1],
      ["maluku-papua", 1],
    ]);
  });
});
