import "server-only";
import { db, type DbExecutor } from "@/server/db";
import type { UserRole } from "@/server/db/schema";
import { paginate } from "@/lib/pagination";
import { guideRepository, type GuideValues } from "@/server/repositories/guide.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { auditService } from "./audit.service";
import { DomainError } from "./errors";
import { linkError, normalizeEmail, roleAfterUnlink } from "./guide.rules";
import { assertActorCanManageUsers } from "./user.service";

export type GuideInput = GuideValues & { destinationIds: number[] };

async function assertDestinationsExist(tx: DbExecutor, ids: number[]) {
  if ((await guideRepository.countDestinations(tx, ids)) !== ids.length) {
    throw new DomainError("notFound");
  }
}

function splitInput({ destinationIds, ...values }: GuideInput) {
  return { values, destinationIds: [...new Set(destinationIds)] };
}

/**
 * Changes an account's role inside the caller's transaction, ending its
 * sessions so the new role (and lost access) applies on the next request.
 */
async function switchRole(
  tx: DbExecutor,
  actorId: string,
  account: { id: string; role: UserRole },
  nextRole: UserRole,
) {
  if (account.role === nextRole) return;
  await userRepository.setRole(tx, account.id, nextRole);
  await userRepository.deleteSessions(tx, account.id);
  await auditService.record(
    {
      actorId,
      action: "user.role_changed",
      entityType: "user",
      entityId: account.id,
      details: { from: account.role, to: nextRole },
    },
    tx,
  );
}

export const guideService = {
  listForAdmin(query: string | undefined, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => guideRepository.countAdmin(query),
      load: (limit, offset) => guideRepository.listAdmin(query, limit, offset),
    });
  },

  /** Guide, its destination ids and the linked account, for the edit page. */
  async detailForAdmin(id: number) {
    const guide = await guideRepository.findById(id);
    if (!guide) throw new DomainError("notFound");
    const [destinationIds, account] = await Promise.all([
      guideRepository.destinationIdsOf(id),
      guide.userId ? guideRepository.findAccount(guide.userId) : Promise.resolve(undefined),
    ]);
    return { guide, destinationIds, account: account ?? null };
  },

  destinationOptions() {
    return guideRepository.destinationOptions();
  },

  async create(actorId: string, input: GuideInput): Promise<{ id: number }> {
    const { values, destinationIds } = splitInput(input);
    return db.transaction(async (tx) => {
      await assertDestinationsExist(tx, destinationIds);
      const guide = await guideRepository.insert(tx, values);
      await guideRepository.replaceDestinations(tx, guide.id, destinationIds);
      await auditService.record(
        {
          actorId,
          action: "guide.created",
          entityType: "guide",
          entityId: guide.id,
          details: { name: guide.name },
        },
        tx,
      );
      return { id: guide.id };
    });
  },

  async update(actorId: string, id: number, input: GuideInput): Promise<void> {
    const { values, destinationIds } = splitInput(input);
    await db.transaction(async (tx) => {
      const guide = await guideRepository.lockById(tx, id);
      if (!guide) throw new DomainError("notFound");
      await assertDestinationsExist(tx, destinationIds);
      await guideRepository.update(tx, id, values);
      await guideRepository.replaceDestinations(tx, id, destinationIds);
      await auditService.record(
        {
          actorId,
          action: "guide.updated",
          entityType: "guide",
          entityId: id,
          details: { name: values.name, active: values.isActive },
        },
        tx,
      );
    });
  },

  /**
   * Links an existing account (by email) as the guide's partner portal login
   * and makes it a `partner`. Everything happens under row locks in one
   * transaction: the actor is re-checked (admins only), back-office accounts
   * and accounts already serving another guide are refused.
   */
  async linkAccount(actorId: string, guideId: number, rawEmail: string): Promise<boolean> {
    const email = normalizeEmail(rawEmail);
    return db.transaction(async (tx) => {
      await assertActorCanManageUsers(tx, actorId);
      const guide = await guideRepository.lockById(tx, guideId);
      if (!guide) throw new DomainError("notFound");
      const account = await userRepository.lockByEmail(tx, email);
      if (!account) throw new DomainError("guideAccountNotFound");
      const linkedGuide = await guideRepository.lockByUserId(tx, account.id);

      const error = linkError({
        guideId,
        guideUserId: guide.userId,
        account,
        accountGuideId: linkedGuide?.id ?? null,
      });
      if (error) throw new DomainError(error);
      if (guide.userId === account.id && account.role === "partner") return false;

      await guideRepository.setUserId(tx, guideId, account.id);
      await switchRole(tx, actorId, account, "partner");
      await auditService.record(
        {
          actorId,
          action: "guide.linked",
          entityType: "guide",
          entityId: guideId,
          details: { userId: account.id },
        },
        tx,
      );
      return true;
    });
  },

  /** Removes the portal account from a guide; a partner goes back to traveller. */
  async unlinkAccount(actorId: string, guideId: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      await assertActorCanManageUsers(tx, actorId);
      const guide = await guideRepository.lockById(tx, guideId);
      if (!guide) throw new DomainError("notFound");
      if (!guide.userId) return false;
      const account = await userRepository.lockById(tx, guide.userId);

      await guideRepository.setUserId(tx, guideId, null);
      if (account) await switchRole(tx, actorId, account, roleAfterUnlink(account.role));
      await auditService.record(
        {
          actorId,
          action: "guide.updated",
          entityType: "guide",
          entityId: guideId,
          details: { unlinkedUserId: guide.userId },
        },
        tx,
      );
      return true;
    });
  },
};
