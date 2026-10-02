import type { Locale } from "./routing";

/**
 * Messages are split per namespace (messages/<locale>/<namespace>.json)
 * so features can own their copy without editing one giant file.
 */
export const namespaces = [
  "common",
  "errors",
  "home",
  "tours",
  "destinations",
  "auth",
  "booking",
  "account",
  "admin",
  "payment",
  "reviews",
  "media",
  "emails",
  "pages",
  // Back-office feature areas (one file each so features don't collide).
  "adminBooking",
  "adminPayments",
  "adminAvailability",
  "adminUsers",
  "adminInsights",
] as const;

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    namespaces.map(
      async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const,
    ),
  );
  return Object.fromEntries(entries);
}
