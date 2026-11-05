import { describe, expect, it } from "vitest";
import { pairLines, splitPairs } from "./lines";

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
