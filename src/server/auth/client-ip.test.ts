import { describe, expect, it } from "vitest";
import { proxyConfigFromEnv, resolveClientIp } from "./client-ip";

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe("resolveClientIp", () => {
  it("ignores forwarded headers unless the proxy is trusted", () => {
    const config = { trustProxy: false, trustedProxies: [] };
    expect(resolveClientIp(headers({ "x-forwarded-for": "203.0.113.9" }), config)).toBeNull();
  });

  it("accepts a single-value header from a trusted proxy", () => {
    const config = { trustProxy: true, trustedProxies: [] };
    expect(resolveClientIp(headers({ "x-forwarded-for": "203.0.113.9" }), config)).toBe(
      "203.0.113.9",
    );
    expect(resolveClientIp(headers({ "x-real-ip": "203.0.113.9" }), config)).toBe("203.0.113.9");
  });

  it("rejects a spoofable multi-hop chain when no proxy list is configured", () => {
    const config = { trustProxy: true, trustedProxies: [] };
    expect(
      resolveClientIp(headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), config),
    ).toBeNull();
  });

  it("takes the right-most untrusted hop, so a spoofed left-most value is ignored", () => {
    const config = { trustProxy: true, trustedProxies: ["10.0.0.2"] };
    const chain = "6.6.6.6, 203.0.113.9, 10.0.0.2";
    expect(resolveClientIp(headers({ "x-forwarded-for": chain }), config)).toBe("203.0.113.9");
  });

  it("returns null for garbage values", () => {
    const config = { trustProxy: true, trustedProxies: [] };
    expect(resolveClientIp(headers({ "x-forwarded-for": "not-an-ip" }), config)).toBeNull();
  });
});

describe("proxyConfigFromEnv", () => {
  it("defaults to not trusting the proxy", () => {
    expect(proxyConfigFromEnv({} as NodeJS.ProcessEnv)).toEqual({
      trustProxy: false,
      trustedProxies: [],
    });
  });

  it("parses the trusted proxy list", () => {
    expect(
      proxyConfigFromEnv({ TRUST_PROXY: "true", TRUSTED_PROXIES: "10.0.0.2, 10.0.0.3" } as never),
    ).toEqual({ trustProxy: true, trustedProxies: ["10.0.0.2", "10.0.0.3"] });
  });
});
