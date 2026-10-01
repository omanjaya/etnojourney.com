import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./errors";

describe("isUniqueViolation", () => {
  const pg = { code: "23505", constraint_name: "tours_slug_unique" };

  it("detects a raw postgres-js unique violation", () => {
    expect(isUniqueViolation(pg)).toBe(true);
    expect(isUniqueViolation(pg, "tours_slug_unique")).toBe(true);
  });

  it("detects a violation wrapped by Drizzle", () => {
    const wrapped = Object.assign(new Error("Failed query"), { cause: pg });
    expect(isUniqueViolation(wrapped, "tours_slug_unique")).toBe(true);
  });

  it("ignores other constraints and other errors", () => {
    expect(isUniqueViolation(pg, "bookings_code_unique")).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
