"use server";

import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/guards";
import { bookingService } from "@/server/services/booking.service";
import { notificationService } from "@/server/services/notification.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { bookingIdSchema, createBookingSchema } from "./schemas";

export type CreatedBooking = { code: string; bookingId: number };

async function unauthorized() {
  const t = await getTranslations("errors");
  return fail(t("unauthorized"));
}

export async function createBookingAction(
  _prev: ActionResult<CreatedBooking> | null,
  formData: FormData,
): Promise<ActionResult<CreatedBooking>> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = await parseInput(createBookingSchema, Object.fromEntries(formData));
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const booking = await bookingService.create(user.id, parsed.data);
    after(() => notificationService.bookingCreated(booking.id));
    revalidate.account();
    revalidate.admin();
    return { code: booking.code, bookingId: booking.id };
  });
}

export async function cancelBookingAction(bookingId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const id = bookingIdSchema.safeParse(bookingId);
  if (!id.success) return fail((await getTranslations("errors"))("notFound"));

  return runAction(async () => {
    // Same path as the paid cancel dialog: ownership and status checked under
    // a row lock, audited as `booking.cancelled_by_traveller`.
    // The button promised a free cancellation; a booking paid meanwhile is refused.
    const result = await bookingService.cancelByTraveller(user.id, id.data, { kind: "free" });
    after(() => notificationService.bookingCancelledByTraveller(result));
    revalidate.account();
    revalidate.admin();
    return undefined;
  });
}
