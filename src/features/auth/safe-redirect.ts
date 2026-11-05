import { can, isBackofficeRole } from "@/server/auth/permissions";

/**
 * Accepts only same-origin relative paths (query and hash allowed) to prevent
 * open redirects. Rejects protocol-relative ("//evil.com"), backslash tricks
 * ("/\evil.com") and control/whitespace characters, which browsers strip from
 * URLs (so "/\t/evil.com" would otherwise become "//evil.com").
 */
export function isSafeRedirectPath(next: string | null | undefined): next is string {
  return (
    !!next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    !/[\u0000-\u001f\u007f\s]/.test(next)
  );
}

/** `next` when it is a safe in-app path, otherwise `fallback`. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/account"): string {
  return isSafeRedirectPath(next) ? next : fallback;
}

/**
 * Where a sign-in without a `next` page lands: staff and the owner go to the
 * back office, partners to their portal, travellers to their account.
 */
export function landingPathForRole(role: string | null | undefined): string {
  if (isBackofficeRole(role)) return "/admin";
  if (can(role, "partner.portal")) return "/partner";
  return "/account";
}
