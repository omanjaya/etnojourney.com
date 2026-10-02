/**
 * Accepts only same-origin relative paths (query and hash allowed) to prevent
 * open redirects. Rejects protocol-relative ("//evil.com"), backslash tricks
 * ("/\evil.com") and control/whitespace characters, which browsers strip from
 * URLs (so "/\t/evil.com" would otherwise become "//evil.com").
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/account"): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f\s]/.test(next)
  ) {
    return fallback;
  }
  return next;
}
