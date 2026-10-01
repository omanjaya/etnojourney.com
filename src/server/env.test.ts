import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

const base = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/etnojourney",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("checkEnv", () => {
  it("accepts a minimal development config and applies defaults", () => {
    const result = checkEnv({ ...base, NODE_ENV: "development" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.MIDTRANS_IS_PRODUCTION).toBe("false");
      expect(result.env.TRUST_PROXY).toBe("false");
      expect(result.env.SITE_URL).toBeUndefined();
    }
  });

  it("treats empty optional values as unset", () => {
    const result = checkEnv({ ...base, SITE_URL: "", RESEND_API_KEY: "  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.SITE_URL).toBeUndefined();
      expect(result.env.RESEND_API_KEY).toBeUndefined();
    }
  });

  it("lists every invalid variable by name without echoing values", () => {
    const secret = "short-secret";
    const result = checkEnv({
      DATABASE_URL: "mysql://x",
      BETTER_AUTH_SECRET: secret,
      BETTER_AUTH_URL: "nope",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join("\n");
      expect(text).toMatch(/DATABASE_URL/);
      expect(text).toMatch(/BETTER_AUTH_SECRET/);
      expect(text).toMatch(/BETTER_AUTH_URL/);
      expect(text).not.toContain(secret);
    }
  });

  it("reports missing required variables", () => {
    const result = checkEnv({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/DATABASE_URL is required/);
  });

  it("requires SITE_URL in production and warns about missing integrations", () => {
    const missing = checkEnv({ ...base, NODE_ENV: "production" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.join()).toMatch(/SITE_URL/);

    const ok = checkEnv({ ...base, NODE_ENV: "production", SITE_URL: "https://etnojourney.id" });
    expect(ok.ok).toBe(true);
    expect(ok.warnings.join("\n")).toMatch(/MIDTRANS_SERVER_KEY/);
    expect(ok.warnings.join("\n")).toMatch(/RESEND_API_KEY/);
  });

  it("rejects non-boolean flags", () => {
    const result = checkEnv({ ...base, TRUST_PROXY: "yes" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toMatch(/TRUST_PROXY/);
  });
});
