"use server";

import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { closureEntityId, groupClosures } from "@/server/services/availability.rules";
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
 * dates are kept (never auto-cancelled); they are returned for the UI. One
 * audit entry covers the whole range.
 */
export async function closeDatesAction(
  values: CloseDatesValues,
): Promise<ActionResult<{ created: number; affected: ClosurePreview["affected"] }>> {
  const parsed = await parseInput(closeDatesSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("availability.manage");
    const { tourId, from, to, reason } = parsed.data;
    const { created, affected } = await availabilityService.close(parsed.data, actor.id);
    if (created.length > 0) {
      await auditService.record({
        actorId: actor.id,
        action: "closure.created",
        entityType: "closure",
        entityId: closureEntityId(tourId, from, to),
        details: { tourId, from, to, days: created.length, reason, bookings: affected.bookings },
      });
    }
    revalidate.admin();
    return { created: created.length, affected };
  });
}

/** Reopens dates by deleting their closures; one audit entry per run of consecutive dates. */
export async function reopenClosuresAction(
  ids: number[],
): Promise<ActionResult<{ removed: number }>> {
  const parsed = await parseInput(reopenSchema, { ids });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("availability.manage");
    const removed = await availabilityService.reopen(parsed.data.ids);
    for (const run of groupClosures(removed)) {
      const { tourId, reason } = run.rows[0];
      await auditService.record({
        actorId: actor.id,
        action: "closure.deleted",
        entityType: "closure",
        entityId: closureEntityId(tourId, run.from, run.to),
        details: { tourId, from: run.from, to: run.to, days: run.rows.length, reason },
      });
    }
    revalidate.admin();
    return { removed: removed.length };
  });
}
