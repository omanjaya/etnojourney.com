import { describe, expect, it } from "vitest";
import { lineCounts, listRows, pairLines, splitPairs } from "./lines";

describe("tour form list lines", () => {
  it("pairs ID and EN lines by index, ignoring blank lines", () => {
    expect(pairLines({ id: "Satu\n\n Dua ", en: "One\nTwo" })).toEqual([
      { id: "Satu", en: "One" },
      { id: "Dua", en: "Two" },
    ]);
  });

  it("keeps mismatched counts so validation can flag them", () => {
    expect(pairLines({ id: "Satu\nDua", en: "One" })).toEqual([
      { id: "Satu", en: "One" },
      { id: "Dua", en: "" },
    ]);
  });

  it("round-trips through splitPairs", () => {
    const pairs = [
      { id: "A", en: "B" },
      { id: "C", en: "D" },
    ];
    expect(pairLines(splitPairs(pairs))).toEqual(pairs);
  });
});

describe("list field sizing", () => {
  it("counts items per locale the way pairLines pairs them", () => {
    expect(lineCounts({ id: "Satu\n\n Dua \n", en: "One" })).toEqual({ id: 2, en: 1 });
    expect(lineCounts({ id: "", en: "" })).toEqual({ id: 0, en: 0 });
  });

  it("gives both columns room for every typed line plus one, at least the minimum", () => {
    expect(listRows({ id: "a\nb", en: "a" }, 4)).toBe(4);
    expect(listRows({ id: "1\n2\n3\n4\n5", en: "1\n2\n3\n4\n5\n6" }, 4)).toBe(7);
  });
});
