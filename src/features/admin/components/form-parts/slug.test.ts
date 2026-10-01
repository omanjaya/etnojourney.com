import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases, strips accents and joins words with hyphens", () => {
    expect(slugify("Melukat & Jejak Subak")).toBe("melukat-jejak-subak");
    expect(slugify("Café Dé Ubud")).toBe("cafe-de-ubud");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  --Tur Budaya!--  ")).toBe("tur-budaya");
  });

  it("caps the length at 80 characters", () => {
    expect(slugify("a".repeat(120))).toHaveLength(80);
  });
});
