import { routing } from "@/i18n/routing";

/**
 * Request header carrying the page being requested. `src/proxy.ts` sets it on
 * every page request (overwriting anything the client sent) so `requireUser`
 * can send a signed-out visitor to `/login?next=<that page>`.
 */
export const RETURN_PATH_HEADER = "x-etno-return-path";

/**
 * The requested page as a locale-free in-app path with its query, e.g.
 * `/en/admin/tours?q=bali` -> `/admin/tours?q=bali`. Links and redirects add
 * the locale themselves, so a prefix left in would be doubled.
 */
export function returnPath(pathname: string, search = ""): string {
  const [, first, ...rest] = pathname.split("/");
  const isLocale = (routing.locales as readonly string[]).includes(first);
  const path = isLocale ? `/${rest.join("/")}` : pathname;
  // "//host" or "/\\host" would leave the site when used as a redirect target.
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  return `${path}${search}`;
}
