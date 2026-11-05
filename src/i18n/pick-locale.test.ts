import { describe, expect, it } from "vitest";
import { pickLocale } from "./pick-locale";

describe("pickLocale", () => {
  it("takes the first supported locale", () => {
    expect(pickLocale("en", "id")).toBe("en");
    expect(pickLocale(null, "en")).toBe("en");
    expect(pickLocale("fr", undefined, "en")).toBe("en");
  });

  it("falls back to the default locale", () => {
    expect(pickLocale()).toBe("id");
    expect(pickLocale(null, "", "de", 42)).toBe("id");
  });
});
