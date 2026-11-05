"use server";

import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import { availabilityService } from "@/server/services/availability.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  closeDatesSchema,
  closureRangeSchema,
  reopenSchema,
  type CloseDatesValues,
  type ClosureRangeValues,
} from "./schemas";

export type ClosurePreview = Awaited<ReturnType<typeof availabilityService.previewClosure>>;

/** What closing a range would do (new dates, bookings that stay on them). Read-only. */
export async function previewClosureAction(
  values: ClosureRangeValues,
): Promise<ActionResult<ClosurePreview>> {
  const parsed = await parseInput(closureRangeSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    await assertPermission("availability.manage");
    return availabilityService.previewClosure(parsed.data);
  });
}

/**
 * Closes a date range for one tour or all tours. Bookings already on those
 * dates are kept (never auto-cancelled); the count is returned for the UI.
 */
export async function closeDatesAction(
  values: CloseDatesValues,
): Promise<ActionResult<{ created: number; affectedBookings: number }>> {
  const parsed = await parseInput(closeDatesSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("availability.manage");
    const { created, affected } = await availabilityService.close(parsed.data, actor.id);
    await Promise.all(
      created.map((closure) =>
        auditService.record({
          actorId: actor.id,
          action: "closure.created",
          entityType: "closure",
          entityId: closure.id,
          details: {
            tourId: closure.tourId,
            date: closure.date,
            reason: closure.reason,
            rangeBookings: affected.bookings,
          },
        }),
      ),
    );
    revalidate.admin();
    return { created: created.length, affectedBookings: affected.bookings };
  });
}

/** Reopens dates by deleting their closures. */
export async function reopenClosuresAction(
  ids: number[],
): Promise<ActionResult<{ removed: number }>> {
  const parsed = await parseInput(reopenSchema, { ids });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("availability.manage");
    const removed = await availabilityService.reopen(parsed.data.ids);
    await Promise.all(
      removed.map((closure) =>
        auditService.record({
          actorId: actor.id,
          action: "closure.deleted",
          entityType: "closure",
          entityId: closure.id,
          details: { tourId: closure.tourId, date: closure.date, reason: closure.reason },
        }),
      ),
    );
    revalidate.admin();
    return { removed: removed.length };
  });
}
