"use server";

import type { ActionResult } from "@/lib/action-result";
import { availabilityService } from "@/server/services/availability.service";
import type { MonthAvailability } from "@/server/services/availability.rules";
import { parseInput, runAction } from "@/features/shared/run-action";
import { availabilityQuerySchema } from "./schemas";

/**
 * Public: seats left per date for a month. No sign-in needed and no booking
 * details are exposed, only aggregate counts.
 */
export async function getAvailabilityAction(
  tourId: number,
  month: string,
): Promise<ActionResult<MonthAvailability>> {
  const parsed = await parseInput(availabilityQuerySchema, { tourId, month });
  if (!parsed.success) return parsed.result;
  return runAction(() => availabilityService.forMonth(parsed.data.tourId, parsed.data.month));
}
