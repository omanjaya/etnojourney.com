import { describe, expect, it } from "vitest";
import { editVersionSchema, parseAdminTourQuery } from "./schemas";

describe("parseAdminTourQuery", () => {
  it("reads search, status and destination", () => {
    expect(
      parseAdminTourQuery({ q: " manuaba ", status: "draft", destination: "kenderan-manuaba" }),
    ).toEqual({ q: "manuaba", status: "draft", destination: "kenderan-manuaba" });
  });

  it("drops invalid values instead of failing", () => {
    expect(
      parseAdminTourQuery({ q: "", status: "archived", destination: "../etc/passwd" }),
    ).toEqual({ q: undefined, status: undefined, destination: undefined });
  });

  it("uses the first value of a repeated param", () => {
    expect(parseAdminTourQuery({ status: ["published", "draft"] }).status).toBe("published");
  });
});

describe("editVersionSchema", () => {
  it("accepts a version token and rejects anything else", () => {
    expect(editVersionSchema.safeParse("0abc12z9xy00kq").success).toBe(true);
    expect(editVersionSchema.safeParse("").success).toBe(false);
    expect(editVersionSchema.safeParse("ABC").success).toBe(false);
    expect(editVersionSchema.safeParse(null).success).toBe(false);
  });
});
