/**
 * Accepts only same-origin relative paths to prevent open redirects.
 * Rejects protocol-relative ("//evil.com") and backslash tricks ("/\evil.com").
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
