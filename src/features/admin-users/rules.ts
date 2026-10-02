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
    default:
      return null;
  }
}

const MAX_DETAIL_LENGTH = 60;

/**
 * Compact `key: value` pairs for an entry's details. `code` is dropped (it is
 * shown as the entity label), nested values are JSON, long values are cut.
 */
export function compactDetails(details: Record<string, unknown> | null): [string, string][] {
  if (!details) return [];
  return Object.entries(details)
    .filter(([key, value]) => key !== "code" && value !== null && value !== undefined)
    .slice(0, 6)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return [
        key,
        text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH - 1)}…` : text,
      ];
    });
}
