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
  // Traveller self-service features.
  "selfService",
  "trip",
  "community",
  // Tour operations: departures, guides, partner portal.
  "adminDepartures",
  "adminGuides",
  "partner",
] as const;

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    namespaces.map(
      async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const,
    ),
  );
  return Object.fromEntries(entries);
}

/**
 * Messages sent to the browser. Server Components translate on the server,
 * so the client only needs what client components call `useTranslations`
 * with. Sending everything would add ~100 KB to every page's HTML.
 * A dotted entry ("partner.nav") sends only that part of a namespace.
 * Missing a namespace here shows up as raw keys in the UI and in tests.
 */
export const clientMessageScopes = {
  public: [
    "common",
    "account",
    "auth",
    "booking",
    "community",
    "home",
    "media",
    "payment",
    "reviews",
    "selfService",
    "tours",
    "partner.nav",
  ],
  admin: [
    "admin",
    "adminAvailability",
    "adminBooking",
    "adminDepartures",
    "adminGuides",
    "adminInsights",
    "adminPayments",
    "adminUsers",
  ],
} as const;

type MessageTree = Record<string, unknown>;

const isTree = (value: unknown): value is MessageTree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Copies the listed namespaces (or dotted sub-trees) out of `messages`. */
export function pickMessages(messages: MessageTree, paths: readonly string[]): MessageTree {
  const out: MessageTree = {};
  for (const path of paths) {
    const keys = path.split(".");
    let source: unknown = messages;
    for (const key of keys) source = isTree(source) ? source[key] : undefined;
    if (source === undefined) continue;
    let target = out;
    for (const key of keys.slice(0, -1)) {
      if (!isTree(target[key])) target[key] = {};
      target = target[key] as MessageTree;
    }
    target[keys[keys.length - 1]] = source;
  }
  return out;
}
