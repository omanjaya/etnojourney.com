import "server-only";
import { db, type DbExecutor } from "@/server/db";
import { can } from "@/server/auth/permissions";
import type { UserRole } from "@/server/db/schema";
import { paginate } from "@/lib/pagination";
import { userRepository, type AdminUserFilters } from "@/server/repositories/user.repository";
import { auditService } from "./audit.service";
import { DomainError } from "./errors";
import { disableError, isDemotion, roleChangeError } from "./user.rules";

/**
 * Re-checks the actor under the same locks as the change: an admin demoted or
 * disabled by a concurrent request must not complete a change that was
 * authorized before it.
 */
export async function assertActorCanManageUsers(tx: DbExecutor, actorId: string) {
  const actor = await userRepository.lockById(tx, actorId);
  if (!actor || actor.disabledAt !== null || !can(actor.role, "users.manage")) {
    throw new DomainError("forbidden");
  }
}

export const userService = {
  listForAdmin(filters: AdminUserFilters, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => userRepository.countAdmin(filters),
      load: (limit, offset) => userRepository.listAdmin(filters, limit, offset),
    });
  },

  /** Profile, bookings and wishlist size for the admin detail page. */
  async detailForAdmin(id: string) {
    const profile = await userRepository.findProfile(id);
    if (!profile) throw new DomainError("notFound");
    const [bookings, wishlistCount] = await Promise.all([
      userRepository.listBookings(id),
      userRepository.countWishlist(id),
    ]);
    return { profile, bookings, wishlistCount };
  },

  findProfile(id: string) {
    return userRepository.findProfile(id);
  },

  listBackofficeAccounts() {
    return userRepository.listBackoffice();
  },

  /**
   * Changes a user's role under row locks (see `lockActiveAdmins`). A demotion
   * also ends the user's sessions, so lost permissions can't linger in any
   * cached session. Returns whether anything changed.
   */
  async changeRole(actorId: string, targetId: string, nextRole: UserRole): Promise<boolean> {
    return db.transaction(async (tx) => {
      const activeAdmins = await userRepository.lockActiveAdmins(tx);
      await assertActorCanManageUsers(tx, actorId);
      const target = await userRepository.lockById(tx, targetId);
      if (!target) throw new DomainError("notFound");
      const error = roleChangeError({ actorId, target, nextRole, activeAdmins });
      if (error) throw new DomainError(error);
      if (target.role === nextRole) return false;

      await userRepository.setRole(tx, targetId, nextRole);
      if (isDemotion(target.role, nextRole)) await userRepository.deleteSessions(tx, targetId);
      await auditService.record(
        {
          actorId,
          action: "user.role_changed",
          entityType: "user",
          entityId: targetId,
          details: { from: target.role, to: nextRole },
        },
        tx,
      );
      return true;
    });
  },

  /**
   * Disables (blocks sign-in and deletes every session, so the user is signed
   * out on their next request) or re-enables an account.
   */
  async setDisabled(actorId: string, targetId: string, disabled: boolean): Promise<boolean> {
    return db.transaction(async (tx) => {
      const activeAdmins = await userRepository.lockActiveAdmins(tx);
      await assertActorCanManageUsers(tx, actorId);
      const target = await userRepository.lockById(tx, targetId);
      if (!target) throw new DomainError("notFound");
      if (disabled) {
        const error = disableError({ actorId, target, activeAdmins });
        if (error) throw new DomainError(error);
      }
      if ((target.disabledAt !== null) === disabled) return false;

      await userRepository.setDisabledAt(tx, targetId, disabled ? new Date() : null);
      if (disabled) await userRepository.deleteSessions(tx, targetId);
      await auditService.record(
        {
          actorId,
          action: disabled ? "user.disabled" : "user.enabled",
          entityType: "user",
          entityId: targetId,
        },
        tx,
      );
      return true;
    });
  },
};
