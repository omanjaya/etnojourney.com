import "server-only";
import type { DbExecutor } from "@/server/db";
import { auditRepository } from "@/server/repositories/audit.repository";

/**
 * Every back-office change is recorded here. Add new verbs to this list (and
 * their labels under `adminActivity.actions` in messages) rather than using
 * free-form strings.
 */
export const auditActions = [
  "booking.status_changed",
  "booking.note_added",
  "payment.refund_required",
  "payment.refunded",
  "tour.created",
  "tour.updated",
  "tour.published",
  "tour.unpublished",
  "tour.featured",
  "tour.unfeatured",
  "destination.created",
  "destination.updated",
  "destination.deleted",
  "review.published",
  "review.hidden",
  "review.replied",
  "closure.created",
  "closure.deleted",
  "user.role_changed",
  "user.disabled",
  "user.enabled",
  "credit.updated",
] as const;

export type AuditAction = (typeof auditActions)[number];
export type AuditEntity = "booking" | "payment" | "tour" | "destination" | "review" | "closure" | "user" | "credit";

export const auditService = {
  /**
   * Records one change. `actorId` is null for system actions (webhooks).
   * Pass the transaction as `executor` when the change itself is transactional.
   */
  async record(
    entry: {
      actorId: string | null;
      action: AuditAction;
      entityType: AuditEntity;
      entityId: string | number;
      details?: Record<string, unknown>;
    },
    executor?: DbExecutor,
  ): Promise<void> {
    await auditRepository.insert({ ...entry, entityId: String(entry.entityId) }, executor);
  },

  historyOf(entityType: AuditEntity, entityId: string | number) {
    return auditRepository.findByEntity(entityType, String(entityId));
  },
};
