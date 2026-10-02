import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

const secret = "s3cret-value-that-is-long-enough";

describe("isCronAuthorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects missing, malformed or wrong credentials", () => {
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized("", secret)).toBe(false);
    expect(isCronAuthorized(secret, secret)).toBe(false);
    expect(isCronAuthorized(`Basic ${secret}`, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret.slice(0, -1)}`, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret} extra`, secret)).toBe(false);
  });

  it("never authorizes when no secret is configured", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer x", "")).toBe(false);
  });
});
