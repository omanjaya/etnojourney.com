/**
 * Pure presentation rules for the users and activity pages (no server-only
 * imports, tested with Vitest).
 */

export type AuditEntry = {
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
};

const BOOKING_CODE = /^[A-Z0-9-]{3,32}$/;
const NUMERIC_ID = /^\d{1,10}$/;
const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Closure actions: `${tourId | "all"}:${from}..${to}` (one entry per range). */
const CLOSURE_RANGE = /^(\d{1,10}|all):(\d{4}-\d{2})-\d{2}\.\.\d{4}-\d{2}-\d{2}$/;
/** Longest review author name used in a search link. */
const MAX_AUTHOR_LENGTH = 80;

const isDate = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE.test(value);

/**
 * Admin page for the entity an audit entry is about, or null when there is no
 * such page. Values come from the database, so they are validated before they
 * become part of a URL.
 */
export function auditEntityHref(entry: AuditEntry): string | null {
  const code = entry.details?.code;
  switch (entry.entityType) {
    case "booking":
    case "payment":
      return typeof code === "string" && BOOKING_CODE.test(code) ? `/admin/bookings/${code}` : null;
    case "tour":
      return NUMERIC_ID.test(entry.entityId) ? `/admin/tours/${entry.entityId}/edit` : null;
    case "destination":
      return NUMERIC_ID.test(entry.entityId) ? `/admin/destinations/${entry.entityId}/edit` : null;
    case "user":
      return USER_ID.test(entry.entityId) ? `/admin/users/${entry.entityId}` : null;
    case "guide":
      return NUMERIC_ID.test(entry.entityId) ? `/admin/guides/${entry.entityId}/edit` : null;
    case "departure": {
      // Entity id is `${tourId}:${YYYY-MM-DD}`.
      const match = /^(\d+):(\d{4}-\d{2}-\d{2})$/.exec(entry.entityId);
      return match ? `/admin/departures/${match[1]}/${match[2]}` : null;
    }
    case "review": {
      // Found again by its author in the moderation list.
      const author = entry.details?.author;
      return typeof author === "string" && author.trim() && author.length <= MAX_AUTHOR_LENGTH
        ? `/admin/reviews?q=${encodeURIComponent(author.trim())}`
        : null;
    }
    case "closure": {
      // The availability calendar of the range's first month (older per-day entries have no link).
      const match = CLOSURE_RANGE.exec(entry.entityId);
      if (!match) return null;
      const [, tour, month] = match;
      return tour === "all"
        ? `/admin/availability?month=${month}`
        : `/admin/availability?tour=${tour}&month=${month}`;
    }
    default:
      return null;
  }
}

/** How the item an entry is about is named, instead of an internal `#id`. */
export type AuditEntityName =
  | { kind: "text"; value: string }
  | { kind: "date"; value: string }
  | { kind: "dateRange"; from: string; to: string };

/**
 * A readable name for the entry's item: the booking code, the name the
 * database has for it (`storedName`: a user's or guide's current name),
 * a slug, name or author kept in the details, or the date(s) a departure or
 * closure is about. Null when nothing better than the id is known.
 */
export function auditEntityName(
  entry: AuditEntry,
  storedName?: string | null,
): AuditEntityName | null {
  const details = entry.details ?? {};
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? { kind: "text" as const, value } : null;
  const named = text(details.code) ?? text(storedName);
  if (named) return named;
  switch (entry.entityType) {
    case "departure": {
      const date = entry.entityId.split(":")[1];
      return isDate(date) ? { kind: "date", value: date } : null;
    }
    case "closure":
      if (isDate(details.from) && isDate(details.to)) {
        return { kind: "dateRange", from: details.from, to: details.to };
      }
      return isDate(details.date) ? { kind: "date", value: details.date } : null;
    case "review":
      return text(details.author);
    default:
      return text(details.slug) ?? text(details.name);
  }
}

/**
 * The tour a departure or closure entry is about, since its name alone is
 * only a date: one tour (`tourTitle`, the current title the database has for
 * `details.tourId`) or every tour (a closure stored with `tourId: null`).
 * Null for other entries, and when the tour no longer exists.
 */
export function auditTourScope<T>(
  entry: AuditEntry,
  tourTitle?: T | null,
): { kind: "tour"; title: T } | { kind: "all" } | null {
  if (entry.entityType !== "departure" && entry.entityType !== "closure") return null;
  const details = entry.details ?? {};
  if (!("tourId" in details)) return null;
  if (details.tourId === null) return entry.entityType === "closure" ? { kind: "all" } : null;
  return tourTitle ? { kind: "tour", title: tourTitle } : null;
}

/** How a detail value is shown: translated, formatted, or as plain text. */
export type AuditDetailKind =
  | "text"
  | "number"
  | "date"
  | "bookingStatus"
  | "role"
  | "yesNo"
  | "money"
  | "percent"
  | "change"
  | "refundReason"
  | "creditFields";

/**
 * Detail keys worth showing, in display order. Everything else is left out,
 * for old and new entries alike: internal ids (tourId, guideId,
 * previousGuideId, userId, bookingId, noteId, photoId), developer values
 * (length, cleared, position) and what already names the item (code, slug,
 * name, author; see `auditEntityName`).
 */
export const AUDIT_DETAIL_KEYS = [
  "tour",
  "rating",
  "guideName",
  "date",
  "from",
  "to",
  "status",
  "days",
  "reason",
  "email",
  "participants",
  "bookings",
  "rangeBookings",
  "rescheduleCount",
  "daysBefore",
  "paid",
  "percent",
  "amount",
  "refundAmount",
  "orderId",
  "note",
  "change",
  "fields",
  "active",
] as const;

export type AuditDetailKey = (typeof AUDIT_DETAIL_KEYS)[number];

export type AuditDetail =
  | { key: AuditDetailKey; kind: "creditFields"; value: string[] }
  | {
      key: AuditDetailKey;
      kind: Exclude<AuditDetailKind, "creditFields">;
      value: string | number | boolean;
    };

const NUMBER_KEYS = new Set<string>([
  "rating",
  "days",
  "participants",
  "bookings",
  "rangeBookings",
  "rescheduleCount",
  "daysBefore",
]);

/** The kind a key has in a given action, before the value's type is checked. */
function kindOf(action: string, key: AuditDetailKey, value: unknown): AuditDetailKind {
  const group = action.split(".")[0];
  if (NUMBER_KEYS.has(key)) return "number";
  switch (key) {
    case "date":
      return "date";
    case "from":
    case "to":
      if (group === "user") return "role";
      if (action === "booking.status_changed" || action === "booking.cancelled_by_traveller") {
        return "bookingStatus";
      }
      return isDate(value) ? "date" : "text";
    case "status":
      return "bookingStatus";
    case "paid":
    case "active":
      return "yesNo";
    case "amount":
    case "refundAmount":
      return "money";
    case "percent":
      return "percent";
    case "change":
      return "change";
    case "reason":
      return group === "payment" ? "refundReason" : "text";
    case "fields":
      return "creditFields";
    default:
      return "text";
  }
}

const MAX_DETAIL_LENGTH = 60;

const cut = (text: string) =>
  text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH - 1)}…` : text;

/**
 * The details of an entry worth showing to the owner, typed so the list can
 * translate statuses and roles, format dates and money, and label each key.
 * The dates of a departure or closure are left to its item name. Values of
 * an unexpected type fall back to short plain text.
 */
export function auditDetails(
  action: string,
  details: Record<string, unknown> | null,
): AuditDetail[] {
  if (!details) return [];
  const group = action.split(".")[0];
  const datesInName = group === "departure" || group === "closure";
  const items: AuditDetail[] = [];
  for (const key of AUDIT_DETAIL_KEYS) {
    const value = details[key];
    if (value === null || value === undefined || value === "") continue;
    if (datesInName && (key === "date" || key === "from" || key === "to")) continue;
    const kind = kindOf(action, key, value);
    const typed =
      kind === "creditFields"
        ? Array.isArray(value) && value.every((field) => typeof field === "string")
        : kind === "number" || kind === "money" || kind === "percent"
          ? typeof value === "number"
          : kind === "yesNo"
            ? typeof value === "boolean"
            : kind === "date"
              ? isDate(value)
              : typeof value === "string";
    if (kind === "creditFields" && typed) {
      items.push({ key, kind, value: value as string[] });
    } else if (typed && kind !== "creditFields") {
      items.push({
        key,
        kind,
        value: typeof value === "string" ? cut(value) : (value as number | boolean),
      });
    } else {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      items.push({ key, kind: "text", value: cut(text) });
    }
  }
  return items;
}
