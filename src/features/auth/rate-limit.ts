/**
 * Fixed-window in-memory rate limiter for auth server actions.
 *
 * Better Auth only rate-limits requests that go through its HTTP handler;
 * server actions call `auth.api.*` directly and bypass it, so we limit here.
 * In-memory state is per server instance; use a shared store (e.g. Redis)
 * when running multiple instances.
 */
type Bucket = { count: number; resetAt: number };

export type RateLimitRule = { max: number; windowMs: number };

export function createRateLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  return {
    /** Records a hit and returns whether it is still within the limit. */
    hit(key: string, rule: RateLimitRule): boolean {
      const time = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= time) {
        buckets.set(key, { count: 1, resetAt: time + rule.windowMs });
        if (buckets.size > 10_000) {
          for (const [k, b] of buckets) if (b.resetAt <= time) buckets.delete(k);
        }
        return true;
      }
      bucket.count += 1;
      return bucket.count <= rule.max;
    },
    /**
     * Takes back one hit, e.g. after a successful sign-in, so legitimate use
     * never uses up a limit. Counting first and refunding afterwards (rather
     * than peeking first and counting failures) keeps parallel requests from
     * all slipping past the check before any failure is recorded.
     */
    undo(key: string): void {
      const bucket = buckets.get(key);
      if (bucket && bucket.resetAt > now() && bucket.count > 0) bucket.count -= 1;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

export type AuthAction = "signIn" | "signUp" | "forgotPassword" | "resetPassword";

/** Per client IP, used when the IP comes from a trusted proxy. */
export const authRateLimits = {
  signIn: { max: 5, windowMs: 60_000 },
  signUp: { max: 3, windowMs: 60_000 },
  forgotPassword: { max: 3, windowMs: 10 * 60_000 },
  resetPassword: { max: 10, windowMs: 10 * 60_000 },
} satisfies Record<AuthAction, RateLimitRule>;

/**
 * Per target account (normalized email, or the reset token for resets).
 * Rotating IPs doesn't help an attacker against these. With a trusted IP the
 * sign-in limit is kept per account AND IP instead (see `rateLimitChecks`).
 */
export const accountRateLimits = {
  signIn: { max: 10, windowMs: 15 * 60_000 },
  signUp: { max: 3, windowMs: 60 * 60_000 },
  forgotPassword: { max: 3, windowMs: 60 * 60_000 },
  resetPassword: { max: 5, windowMs: 10 * 60_000 },
} satisfies Partial<Record<AuthAction, RateLimitRule>>;

/**
 * Account-wide sign-in ceiling, used only with a trusted IP: it caps password
 * guessing spread over many rotating IPs. It sits above what one IP can ever
 * add under the strict per-account+IP limit (at most 5 windows of 10 inside an
 * hour), so a single attacker cannot use it to lock the owner out.
 */
export const signInAccountCeiling: RateLimitRule = { max: 60, windowMs: 60 * 60_000 };

/** Lowercased, trimmed email so `A@x.com ` and `a@x.com` share a bucket. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const authRateLimiter = createRateLimiter();

export type RateLimitCheck = { key: string; rule: RateLimitRule };

/**
 * Buckets a request counts against, strictest first: the client IP when it
 * comes from a trusted proxy, plus the target account when known.
 *
 * Without a trustworthy IP there is deliberately NO shared bucket: a single
 * site-wide counter would let anyone lock every user out by flooding the
 * form. Per-account limits still stop password guessing; set TRUST_PROXY in
 * production behind a proxy to also get per-IP limits.
 *
 * Sign-in with a trusted IP keys the strict account limit by account and IP,
 * so someone who only knows the owner's email cannot lock him out of every
 * device, and adds the looser account-wide `signInAccountCeiling`.
 */
export function rateLimitChecks(
  action: AuthAction,
  clientIp: string | null,
  account?: string,
): RateLimitCheck[] {
  const checks: RateLimitCheck[] = [];
  if (clientIp) checks.push({ key: `${action}:ip:${clientIp}`, rule: authRateLimits[action] });
  const accountRule = (accountRateLimits as Partial<Record<AuthAction, RateLimitRule>>)[action];
  if (!account || !accountRule) return checks;
  if (action === "signIn" && clientIp) {
    checks.push(
      { key: `${action}:account:${account}:ip:${clientIp}`, rule: accountRule },
      { key: `${action}:ceiling:${account}`, rule: signInAccountCeiling },
    );
  } else {
    checks.push({ key: `${action}:account:${account}`, rule: accountRule });
  }
  return checks;
}

/**
 * Counts one attempt against `checks` in order; false when a limit is hit.
 * Stops at the first bucket that refuses: a refused attempt never reaches the
 * password check, so it must not use up the looser buckets after it (one
 * blocked IP could otherwise fill the account-wide ceiling).
 */
export function consumeRateLimit(limiter: RateLimiter, checks: RateLimitCheck[]): boolean {
  for (const { key, rule } of checks) if (!limiter.hit(key, rule)) return false;
  return true;
}

/** Gives back an attempt that `consumeRateLimit` allowed, e.g. a successful sign-in. */
export function refundRateLimit(limiter: RateLimiter, checks: RateLimitCheck[]): void {
  for (const { key } of checks) limiter.undo(key);
}
