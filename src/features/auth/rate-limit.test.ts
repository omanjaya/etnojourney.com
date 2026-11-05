import { describe, expect, it } from "vitest";
import {
  accountRateLimits,
  authRateLimits,
  consumeRateLimit,
  createRateLimiter,
  normalizeEmail,
  rateLimitChecks,
  refundRateLimit,
  signInAccountCeiling,
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

  it("undo takes back one hit in the current window only", () => {
    let time = 0;
    const limiter = createRateLimiter(() => time);
    const rule = { max: 1, windowMs: 1000 };
    expect(limiter.hit("a", rule)).toBe(true);
    limiter.undo("a");
    expect(limiter.hit("a", rule)).toBe(true);
    expect(limiter.hit("a", rule)).toBe(false);
    // Unknown and expired buckets are left alone.
    limiter.undo("missing");
    time = 1000;
    limiter.undo("a");
    expect(limiter.hit("a", rule)).toBe(true);
    expect(limiter.hit("a", rule)).toBe(false);
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
      consumeRateLimit(limiter, rateLimitChecks("signIn", null, `junk${i}@x.test`));
    }
    // ...and a real user is still allowed.
    const real = rateLimitChecks("signIn", null, "real@x.test");
    expect(real.map((c) => c.key)).toEqual(["signIn:account:real@x.test"]);
    expect(consumeRateLimit(limiter, real)).toBe(true);
  });

  it("without a trusted IP, keeps the strict limit per account", () => {
    const limiter = createRateLimiter(() => 0);
    const checks = rateLimitChecks("signIn", null, "owner@x.test");
    const allowed = Array.from({ length: 12 }, () => consumeRateLimit(limiter, checks));
    expect(allowed.filter(Boolean)).toHaveLength(accountRateLimits.signIn.max);
    expect(allowed.at(-1)).toBe(false);
  });

  it("caps guessing from rotating IPs with the account-wide ceiling", () => {
    const limiter = createRateLimiter(() => 0);
    const account = normalizeEmail("  Traveler@EtnoJourney.id ");
    const allowed = Array.from({ length: signInAccountCeiling.max + 5 }, (_, i) =>
      consumeRateLimit(limiter, rateLimitChecks("signIn", `198.51.100.${i}`, account)),
    );
    expect(allowed.filter(Boolean)).toHaveLength(signInAccountCeiling.max);
    expect(allowed.at(-1)).toBe(false);
  });

  it("an attacker's IP hitting the limit does not lock the owner out on another IP", () => {
    const limiter = createRateLimiter(() => 0);
    const owner = "admin@etnojourney.id";
    const attacker = Array.from({ length: 30 }, () =>
      consumeRateLimit(limiter, rateLimitChecks("signIn", "203.0.113.66", owner)),
    );
    expect(attacker.at(-1)).toBe(false);
    expect(consumeRateLimit(limiter, rateLimitChecks("signIn", "198.51.100.7", owner))).toBe(true);
  });

  it("one IP alone can never use up the account-wide ceiling", () => {
    let time = 0;
    const limiter = createRateLimiter(() => time);
    const owner = "admin@etnojourney.id";
    // An attacker sends a wrong password every 10 seconds for three hours, and
    // the owner tries from his own IP every minute: he is never refused.
    for (let second = 0; second < 3 * 60 * 60; second += 10) {
      time = second * 1000;
      consumeRateLimit(limiter, rateLimitChecks("signIn", "203.0.113.66", owner));
      if (second % 60 === 0) {
        const checks = rateLimitChecks("signIn", "198.51.100.7", owner);
        expect(consumeRateLimit(limiter, checks), `at ${second}s`).toBe(true);
        refundRateLimit(limiter, checks);
      }
    }
  });

  it("a successful sign-in costs nothing once refunded", () => {
    const limiter = createRateLimiter(() => 0);
    for (const ip of [null, "198.51.100.7"]) {
      const checks = rateLimitChecks("signIn", ip, "staff@etnojourney.id");
      for (let i = 0; i < 50; i++) {
        expect(consumeRateLimit(limiter, checks)).toBe(true);
        refundRateLimit(limiter, checks);
      }
    }
  });

  it("stops counting at the first bucket that refuses", () => {
    const limiter = createRateLimiter(() => 0);
    const checks = rateLimitChecks("signIn", "203.0.113.66", "owner@x.test");
    for (let i = 0; i < 100; i++) consumeRateLimit(limiter, checks);
    // Only the attempts the per-IP limit let through reached the account buckets.
    const strict = limiter.hit(checks[1].key, checks[1].rule);
    expect(strict).toBe(true);
  });

  it("limits sign-up per email", () => {
    expect(rateLimitChecks("signUp", null, "a@b.c")).toEqual([
      { key: "signUp:account:a@b.c", rule: accountRateLimits.signUp },
    ]);
  });

  it("keeps other actions per account even with a trusted IP", () => {
    expect(rateLimitChecks("forgotPassword", "203.0.113.9", "a@b.c").map((c) => c.key)).toEqual([
      "forgotPassword:ip:203.0.113.9",
      "forgotPassword:account:a@b.c",
    ]);
  });
});
