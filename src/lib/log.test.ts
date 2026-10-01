import { describe, expect, it } from "vitest";
import { logValue } from "./log";

describe("logValue", () => {
  it("escapes line breaks so a value cannot forge a new log entry", () => {
    const forged = "EJ-ABC\n[payment] booking 1 confirmed";
    expect(logValue(forged)).toBe('"EJ-ABC\\n[payment] booking 1 confirmed"');
    expect(logValue(forged)).not.toContain("\n");
  });

  it("truncates long values and stringifies non-strings", () => {
    expect(logValue("x".repeat(500), 10)).toBe(`"${"x".repeat(10)}…"`);
    expect(logValue(42)).toBe('"42"');
  });
});
