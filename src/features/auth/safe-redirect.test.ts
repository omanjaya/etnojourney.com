import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps relative in-app paths", () => {
    expect(safeRedirectPath("/tours/ubud")).toBe("/tours/ubud");
  });

  it("falls back for external or malformed targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil", "", null, undefined]) {
      expect(safeRedirectPath(bad)).toBe("/account");
    }
  });
});
