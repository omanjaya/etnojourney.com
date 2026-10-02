/**
 * Pure helpers over audit actions (no server-only imports, so pages and tests
 * can use them). Groups are derived from the action prefix, so a verb appended
 * to `auditActions` lands in its group automatically.
 */

export const auditGroups = [
  "bookings",
  "payments",
  "catalogue",
  "reviews",
  "availability",
  "users",
  "credits",
  "operations",
] as const;

export type AuditGroup = (typeof auditGroups)[number];

const groupByPrefix: Record<string, AuditGroup> = {
  booking: "bookings",
  payment: "payments",
  tour: "catalogue",
  destination: "catalogue",
  review: "reviews",
  closure: "availability",
  user: "users",
  credit: "credits",
  guide: "operations",
  departure: "operations",
};

export function auditGroupOf(action: string): AuditGroup | null {
  return groupByPrefix[action.split(".")[0]] ?? null;
}

/** The actions (from `all`) that belong to `group`. */
export function actionsInGroup<A extends string>(all: readonly A[], group: AuditGroup): A[] {
  return all.filter((action) => auditGroupOf(action) === group);
}
