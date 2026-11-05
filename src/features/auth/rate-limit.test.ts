import { describe, expect, it } from "vitest";
import {
  accountRateLimits,
  authRateLimits,
  createRateLimiter,
  normalizeEmail,
  rateLimitChecks,
} from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max hits per window, then blocks", () => {
    let time = 0;
    const limiter = createRateLimiter(() => time);
    const rule = { max: 3, windowMs: 1000 };
    expect([1, 2, 3].map(() => limiter.hit("a", rule))).toEqual([true, true, true]);
    expect(limiter.hit("a", rule)).toBe(false);
    expect(limiter.hit("b", rule)).toBe(true);
    time = 1000;
    expect(limiter.hit("a", rule)).toBe(true);
  });
});

describe("rateLimitChecks", () => {
  it("uses the client IP bucket when the IP is trusted", () => {
    const [ip] = rateLimitChecks("signIn", "203.0.113.9");
    expect(ip.key).toBe("signIn:ip:203.0.113.9");
    expect(ip.rule).toBe(authRateLimits.signIn);
  });

  it("has no site-wide bucket without a trusted IP, so flooding cannot lock everyone out", () => {
    const limiter = createRateLimiter(() => 0);
    // An attacker floods sign-in with junk accounts...
    for (let i = 0; i < 500; i++) {
      for (const c of rateLimitChecks("signIn", null, `junk${i}@x.test`))
        limiter.hit(c.key, c.rule);
    }
    // ...and a real user is still allowed.
    const real = rateLimitChecks("signIn", null, "real@x.test");
    expect(real.map((c) => c.key)).toEqual(["signIn:account:real@x.test"]);
    expect(real.every((c) => limiter.hit(c.key, c.rule))).toBe(true);
  });

  it("adds a per-account bucket that rotating IPs cannot escape", () => {
    const time = 0;
    const limiter = createRateLimiter(() => time);
    const account = normalizeEmail("  Traveler@EtnoJourney.id ");
    const allowed = Array.from({ length: 12 }, (_, i) =>
      rateLimitChecks("signIn", `198.51.100.${i}`, account).every((c) =>
        limiter.hit(c.key, c.rule),
      ),
    );
    expect(allowed.filter(Boolean)).toHaveLength(accountRateLimits.signIn.max);
    expect(allowed.at(-1)).toBe(false);
  });

  it("limits sign-up per email", () => {
    expect(rateLimitChecks("signUp", null, "a@b.c")).toEqual([
      { key: "signUp:account:a@b.c", rule: accountRateLimits.signUp },
    ]);
  });
});
