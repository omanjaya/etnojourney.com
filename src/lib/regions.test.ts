import { describe, expect, it } from "vitest";
import { groupByIsland, ISLAND_SQL_PATTERNS, islandOf, regionsInQuery } from "./regions";

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

describe("ISLAND_SQL_PATTERNS", () => {
  // Mirrors the SQL rule: first matching pattern wins (case-insensitive).
  const sqlIslandOf = (province: string) =>
    ISLAND_SQL_PATTERNS.find(([, source]) => new RegExp(source, "i").test(province))?.[0] ??
    "other";

  it("classifies provinces exactly like islandOf", () => {
    const provinces = [
      "Bali",
      "Nusa Tenggara Timur",
      "Nusa Tenggara Barat",
      "DI Yogyakarta",
      "DKI Jakarta",
      "Jawa Barat",
      "Banten",
      "Sumatera Utara",
      "Kepulauan Riau",
      "Kepulauan Bangka Belitung",
      "Kalimantan Barat",
      "Sulawesi Tenggara",
      "Gorontalo",
      "Maluku",
      "Papua Barat Daya",
      "Atlantis",
    ];
    for (const province of provinces) expect(sqlIslandOf(province)).toBe(islandOf(province));
  });
});

describe("regionsInQuery", () => {
  it("recognizes island names and English aliases", () => {
    expect(regionsInQuery("Bali").islands).toEqual(["bali"]);
    expect(regionsInQuery("tours in Java").islands).toEqual(["jawa"]);
    expect(regionsInQuery("Borneo longhouse").islands).toEqual(["kalimantan"]);
    expect(regionsInQuery("Sumatera").islands).toEqual(["sumatra"]);
  });

  it("expands eastern Indonesia to its island groups", () => {
    expect(regionsInQuery("Eastern Indonesia").islands.sort()).toEqual(
      ["maluku-papua", "nusa-tenggara", "sulawesi"].sort(),
    );
    expect(regionsInQuery("indonesia timur").islands).toHaveLength(3);
  });

  it("keeps Papua and Maluku as provinces, not the whole group", () => {
    expect(regionsInQuery("Papua")).toEqual({ islands: [], provinces: ["papua"] });
    expect(regionsInQuery("Moluccas").provinces).toEqual(["maluku"]);
  });

  it("returns nothing for ordinary keywords", () => {
    expect(regionsInQuery("tenun ikat")).toEqual({ islands: [], provinces: [] });
  });
});
