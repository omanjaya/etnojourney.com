import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/**
 * Checks `Authorization: Bearer <secret>` in constant time. Both sides are
 * hashed first so the comparison doesn't leak the secret's length either.
 */
export function isCronAuthorized(header: string | null | undefined, secret: string): boolean {
  if (!secret) return false;
  const match = /^Bearer[ ]+(\S+)[ ]*$/.exec(header ?? "");
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(secret));
}
