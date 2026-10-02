/**
 * Back-office permissions. `admin` is the owner; `staff` runs day-to-day
 * operations. Pure module (no server-only imports) so the UI can hide links
 * with the same rules the server enforces.
 */
import type { UserRole } from "@/server/db/schema";

export const permissions = {
  /** Enter /admin at all. */
  "backoffice.access": ["staff", "admin"],
  "bookings.manage": ["staff", "admin"],
  "catalogue.manage": ["staff", "admin"],
  "availability.manage": ["staff", "admin"],
  "reviews.manage": ["staff", "admin"],
  "credits.manage": ["staff", "admin"],
  "payments.refund": ["admin"],
  "reports.view": ["admin"],
  "users.manage": ["admin"],
  "audit.view": ["admin"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof permissions;

/** `role` is loose because session users carry it as a plain string. */
export function can(role: string | null | undefined, permission: Permission): boolean {
  return (permissions[permission] as readonly string[]).includes(role ?? "");
}

export const isBackofficeRole = (role: string | null | undefined) => can(role, "backoffice.access");
