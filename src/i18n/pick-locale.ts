import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/**
 * The first candidate that is a supported locale, else the default. Used by
 * route handlers that have no locale segment, e.g. CSV exports:
 * `pickLocale(url.searchParams.get("locale"), user.locale)`.
 */
export function pickLocale(...candidates: unknown[]): Locale {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && hasLocale(routing.locales, candidate)) return candidate;
  }
  return routing.defaultLocale;
}
