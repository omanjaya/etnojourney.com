import type { UserRole } from "@/server/db/schema";

/**
 * Pure rules for back-office user management. The service applies them under
 * row locks, so `activeAdmins` is an up-to-date count of enabled admins.
 */

export type ManagedUser = { id: string; role: UserRole; disabledAt: Date | null };

export type UserChangeError = "cannotChangeSelf" | "lastAdmin";

const isActiveAdmin = (u: ManagedUser) => u.role === "admin" && u.disabledAt === null;

/**
 * An admin may not change their own role (no accidental self-lockout), and the
 * last active admin may not be demoted, or nobody could manage users again.
 */
export function roleChangeError(params: {
  actorId: string;
  target: ManagedUser;
  nextRole: UserRole;
  activeAdmins: number;
}): UserChangeError | null {
  const { actorId, target, nextRole, activeAdmins } = params;
  if (actorId === target.id) return "cannotChangeSelf";
  if (isActiveAdmin(target) && nextRole !== "admin" && activeAdmins <= 1) return "lastAdmin";
  return null;
}

/** Disabling follows the same protections as demotion. Enabling is always allowed. */
export function disableError(params: {
  actorId: string;
  target: ManagedUser;
  activeAdmins: number;
}): UserChangeError | null {
  const { actorId, target, activeAdmins } = params;
  if (actorId === target.id) return "cannotChangeSelf";
  if (isActiveAdmin(target) && activeAdmins <= 1) return "lastAdmin";
  return null;
}

const roleRank: Record<UserRole, number> = { user: 0, staff: 1, admin: 2 };

/** True when `next` grants fewer permissions than `previous`. */
export function isDemotion(previous: UserRole, next: UserRole): boolean {
  return roleRank[next] < roleRank[previous];
}
