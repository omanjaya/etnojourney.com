import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps relative in-app paths", () => {
    expect(safeRedirectPath("/tours/ubud")).toBe("/tours/ubud");
  });

  it("keeps the query and hash so a booking can resume after signing in", () => {
    const next = "/tours/ubud?date=2026-11-20&people=2#booking";
    expect(safeRedirectPath(next)).toBe(next);
  });

  it("falls back for external or malformed targets", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/ /evil.com",
      "evil",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ]) {
      expect(safeRedirectPath(bad)).toBe("/account");
    }
  });
});
