import { describe, expect, it } from "vitest";
import { returnPath } from "./return-path";

describe("returnPath", () => {
  it("keeps a default-locale path and its query as is", () => {
    expect(returnPath("/admin/tours", "?q=bali&page=2")).toBe("/admin/tours?q=bali&page=2");
  });

  it("strips the locale prefix so redirects don't add it twice", () => {
    expect(returnPath("/en/admin/tours/12/edit")).toBe("/admin/tours/12/edit");
    expect(returnPath("/id/account", "?tab=trips")).toBe("/account?tab=trips");
  });

  it("maps a bare locale root to the home page", () => {
    expect(returnPath("/en")).toBe("/");
    expect(returnPath("/")).toBe("/");
  });

  it("only strips a whole first segment that is a locale", () => {
    expect(returnPath("/english/tours")).toBe("/english/tours");
    expect(returnPath("/tours/en")).toBe("/tours/en");
  });
});
