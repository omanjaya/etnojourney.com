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

  it("cuts a long title at a whole word, never leaving a trailing hyphen", () => {
    const slug = slugify(
      "Melukat di Air Terjun Manuaba dan Pura Beji bersama keluarga pemangku desa Bali, Gianyar",
    );
    expect(slug).toBe(
      "melukat-di-air-terjun-manuaba-dan-pura-beji-bersama-keluarga-pemangku-desa-bali",
    );
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("keeps a word that ends exactly at the limit", () => {
    const title = `${"a".repeat(39)} ${"b".repeat(40)} tambahan`;
    expect(slugify(title)).toBe(`${"a".repeat(39)}-${"b".repeat(40)}`);
  });
});
