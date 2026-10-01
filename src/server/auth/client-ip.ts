import { isIP } from "node:net";

/**
 * Client IP resolution for rate limiting.
 *
 * Forwarded headers are client-controlled unless a reverse proxy we trust
 * rewrites them, so they are ignored unless `TRUST_PROXY=true`. Then:
 *  - with `TRUSTED_PROXIES` (comma-separated proxy IPs), `X-Forwarded-For` is
 *    walked right to left, skipping those proxies; the first other hop is the client;
 *  - without it, only a single-value header is accepted (the proxy must
 *    overwrite the header rather than append to it).
 * This mirrors Better Auth's `advanced.ipAddress` handling so both limiters agree.
 */
export type ProxyConfig = { trustProxy: boolean; trustedProxies: string[] };

export function proxyConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ProxyConfig {
  return {
    trustProxy: env.TRUST_PROXY === "true",
    trustedProxies: (env.TRUSTED_PROXIES ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  };
}

type HeaderReader = { get(name: string): string | null };

function fromForwardedChain(value: string, trustedProxies: string[]): string | null {
  const hops = value
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  if (hops.length === 0) return null;
  if (trustedProxies.length === 0) {
    return hops.length === 1 && isIP(hops[0]) ? hops[0] : null;
  }
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i];
    if (!isIP(hop)) return null;
    if (!trustedProxies.includes(hop)) return hop;
  }
  return null;
}

/** Returns the trustworthy client IP, or null when none can be determined. */
export function resolveClientIp(headers: HeaderReader, config: ProxyConfig): string | null {
  if (!config.trustProxy) return null;
  for (const name of ["x-forwarded-for", "x-real-ip"]) {
    const value = headers.get(name);
    if (!value) continue;
    const ip = fromForwardedChain(value, config.trustedProxies);
    if (ip) return ip.toLowerCase();
  }
  return null;
}
