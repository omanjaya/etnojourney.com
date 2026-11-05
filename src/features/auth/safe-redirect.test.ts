import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, landingPathForRole, safeRedirectPath } from "./safe-redirect";

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
      expect(isSafeRedirectPath(bad)).toBe(false);
    }
  });

  it("uses the given fallback", () => {
    expect(safeRedirectPath(undefined, "/admin")).toBe("/admin");
    expect(safeRedirectPath("/admin/tours", "/account")).toBe("/admin/tours");
  });
});

describe("landingPathForRole", () => {
  it("sends staff and the owner to the back office", () => {
    expect(landingPathForRole("admin")).toBe("/admin");
    expect(landingPathForRole("staff")).toBe("/admin");
  });

  it("sends partners to their portal", () => {
    expect(landingPathForRole("partner")).toBe("/partner");
  });

  it("sends travellers and unknown roles to their account", () => {
    for (const role of ["user", "", null, undefined, "owner"]) {
      expect(landingPathForRole(role)).toBe("/account");
    }
  });
});
