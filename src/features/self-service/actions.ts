"use server";

import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/guards";
import { bookingService } from "@/server/services/booking.service";
import { notificationService } from "@/server/services/notification.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { cancelBookingSchema, rescheduleBookingSchema } from "./schemas";

async function unauthorized() {
  const t = await getTranslations("errors");
  return fail(t("unauthorized"));
}

/**
 * Traveller cancels their own booking (paid or unpaid). Ownership, status,
 * the refund tier and the refund flag are all decided by the service under a
 * row lock; `expectedPercent` makes it refuse if the tier moved since the
 * dialog was shown.
 */
export async function cancelOwnBookingAction(
  bookingId: number,
  expectedPercent?: number,
): Promise<ActionResult<{ refundAmount: number; percent: number }>> {
  const parsed = await parseInput(cancelBookingSchema, { bookingId, expectedPercent });
  if (!parsed.success) return parsed.result;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return runAction(async () => {
    const result = await bookingService.cancelByTraveller(
      user.id,
      parsed.data.bookingId,
      parsed.data.expectedPercent,
    );
    after(() => notificationService.bookingCancelledByTraveller(result));
    revalidate.account();
    revalidate.admin();
    return { refundAmount: result.refundAmount, percent: result.percent };
  });
}

/** Traveller moves their own booking to another date (availability re-checked on the server). */
export async function rescheduleBookingAction(
  bookingId: number,
  travelDate: string,
): Promise<ActionResult<{ travelDate: string }>> {
  const parsed = await parseInput(rescheduleBookingSchema, { bookingId, travelDate });
  if (!parsed.success) return parsed.result;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return runAction(async () => {
    const { booking, from } = await bookingService.reschedule(
      user.id,
      parsed.data.bookingId,
      parsed.data.travelDate,
    );
    after(() => notificationService.bookingRescheduled(booking.id, from));
    revalidate.account();
    revalidate.admin();
    return { travelDate: booking.travelDate };
  });
}
