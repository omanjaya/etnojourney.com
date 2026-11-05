import { describe, expect, it } from "vitest";
import { caretAfterDigits, countDigits, formatPriceInput, parsePrice, stripCents } from "./price";

describe("parsePrice", () => {
  it("reads Indonesian and English thousands separators the same way", () => {
    expect(parsePrice("450.000")).toBe(450_000);
    expect(parsePrice("450,000")).toBe(450_000);
    expect(parsePrice("Rp 450.000")).toBe(450_000);
    expect(parsePrice("350000")).toBe(350_000);
  });

  it("keeps an empty field empty", () => {
    expect(parsePrice("")).toBe("");
    expect(parsePrice("Rp ")).toBe("");
  });
});

describe("stripCents", () => {
  it("drops a trailing cents part from pasted prices", () => {
    expect(parsePrice(stripCents("Rp 350.000,00"))).toBe(350_000);
    expect(parsePrice(stripCents("IDR 1,250,000.00 "))).toBe(1_250_000);
  });

  it("keeps thousands groups", () => {
    expect(stripCents("450.000")).toBe("450.000");
    expect(stripCents("450,000")).toBe("450,000");
    expect(stripCents("350000")).toBe("350000");
  });
});

describe("formatPriceInput", () => {
  it("groups thousands for the admin's language", () => {
    expect(formatPriceInput(450_000, "id")).toBe("450.000");
    expect(formatPriceInput(1_250_000, "en")).toBe("1,250,000");
    expect(formatPriceInput("", "id")).toBe("");
  });

  it("round-trips through parsePrice", () => {
    expect(parsePrice(formatPriceInput(3_500_000, "id"))).toBe(3_500_000);
  });
});

describe("caret helpers", () => {
  it("counts digits before the caret", () => {
    expect(countDigits("3.45")).toBe(3);
    expect(countDigits("")).toBe(0);
  });

  it("finds the position after the n-th digit in the regrouped text", () => {
    // Typing "4" after "3" in "350.000" gives "3450.000", regrouped to "3.450.000".
    expect(caretAfterDigits("3.450.000", 2)).toBe(3);
    expect(caretAfterDigits("3.450.000", 0)).toBe(0);
    expect(caretAfterDigits("450.000", 6)).toBe(7);
    expect(caretAfterDigits("450", 9)).toBe(3);
  });
});
