"use server";

import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, type ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import type { BookingStatus } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { destinationService } from "@/server/services/destination.service";
import { DomainError } from "@/server/services/errors";
import { notificationService } from "@/server/services/notification.service";
import { tourService } from "@/server/services/tour.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  destinationFormSchema,
  destinationIdSchema,
  toggleTourSchema,
  tourFormSchema,
  updateBookingStatusSchema,
  type DestinationFormValues,
  type TourFormValues,
} from "./schemas";


/** Public pages that list or show tours, plus the admin catalogue. */
function revalidateCatalogue() {
  revalidate.everything();
}

export async function updateBookingStatusAction(
  bookingId: number,
  status: BookingStatus,
): Promise<ActionResult<{ status: BookingStatus }>> {
  const parsed = await parseInput(updateBookingStatusSchema, { bookingId, status });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("bookings.manage");
    const booking = await bookingService.changeStatus(
      parsed.data.bookingId,
      parsed.data.status,
      actor.id,
    );
    after(() => notificationService.bookingStatusChanged(booking.id));
    revalidate.admin();
    revalidate.account();
    return { status: booking.status };
  });
}

export async function setTourPublishedAction(
  tourId: number,
  value: boolean,
): Promise<ActionResult<{ value: boolean }>> {
  const parsed = await parseInput(toggleTourSchema, { tourId, value });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    const tour = await tourService.setPublished(parsed.data.tourId, parsed.data.value);
    await auditService.record({
      actorId: actor.id,
      action: tour.isPublished ? "tour.published" : "tour.unpublished",
      entityType: "tour",
      entityId: tour.id,
      details: { slug: tour.slug },
    });
    revalidateCatalogue();
    return { value: tour.isPublished };
  });
}

export async function setTourFeaturedAction(
  tourId: number,
  value: boolean,
): Promise<ActionResult<{ value: boolean }>> {
  const parsed = await parseInput(toggleTourSchema, { tourId, value });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    const tour = await tourService.setFeatured(parsed.data.tourId, parsed.data.value);
    await auditService.record({
      actorId: actor.id,
      action: tour.isFeatured ? "tour.featured" : "tour.unfeatured",
      entityType: "tour",
      entityId: tour.id,
      details: { slug: tour.slug },
    });
    revalidateCatalogue();
    return { value: tour.isFeatured };
  });
}

export async function createTourAction(values: TourFormValues): Promise<ActionResult<never>> {
  const parsed = await parseInput(tourFormSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    const tour = await tourService.create(parsed.data);
    await auditService.record({
      actorId: actor.id,
      action: "tour.created",
      entityType: "tour",
      entityId: tour.id,
      details: { slug: tour.slug },
    });
    revalidateCatalogue();
    return redirect({ href: "/admin/tours", locale: await getLocale() });
  });
}

export async function updateTourAction(
  tourId: number,
  values: TourFormValues,
): Promise<ActionResult<never>> {
  const parsed = await parseInput(tourFormSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    if (!Number.isInteger(tourId) || tourId < 1) throw new DomainError("notFound");
    await tourService.update(tourId, parsed.data);
    await auditService.record({
      actorId: actor.id,
      action: "tour.updated",
      entityType: "tour",
      entityId: tourId,
      details: { slug: parsed.data.slug },
    });
    revalidateCatalogue();
    return redirect({ href: "/admin/tours", locale: await getLocale() });
  });
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

/**
 * Creates (id = null) or updates a destination, then redirects to the list.
 * A taken slug is reported on the slug field rather than as a generic error.
 */
async function saveDestination(
  id: number | null,
  values: DestinationFormValues,
): Promise<ActionResult<never>> {
  const parsed = await parseInput(destinationFormSchema, values);
  if (!parsed.success) return parsed.result;

  let slugTaken = false;
  const result = await runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    if (id !== null && (!Number.isInteger(id) || id < 1)) throw new DomainError("notFound");
    if (!(await destinationService.isSlugAvailable(parsed.data.slug, id ?? undefined))) {
      slugTaken = true;
      return;
    }
    const saved =
      id === null
        ? await destinationService.create(parsed.data)
        : await destinationService.update(id, parsed.data);
    await auditService.record({
      actorId: actor.id,
      action: id === null ? "destination.created" : "destination.updated",
      entityType: "destination",
      entityId: saved.id,
      details: { slug: saved.slug },
    });
    revalidateCatalogue();
    return redirect({ href: "/admin/destinations", locale: await getLocale() });
  });

  if (slugTaken) {
    const t = await getTranslations("admin.destinationForm");
    return fail(t("slugTaken"), { slug: [t("slugTaken")] });
  }
  // Success redirects on the server, so only failures reach this point.
  return result as ActionResult<never>;
}

export async function createDestinationAction(
  values: DestinationFormValues,
): Promise<ActionResult<never>> {
  return saveDestination(null, values);
}

export async function updateDestinationAction(
  destinationId: number,
  values: DestinationFormValues,
): Promise<ActionResult<never>> {
  return saveDestination(destinationId, values);
}

/** Deletes a destination with no tours; the server re-checks even if the UI disabled it. */
export async function deleteDestinationAction(destinationId: number): Promise<ActionResult<never>> {
  const parsed = await parseInput(destinationIdSchema, destinationId);
  if (!parsed.success) return parsed.result;

  let inUse = false;
  const result = await runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    if ((await destinationService.remove(parsed.data)) === "inUse") {
      inUse = true;
      return;
    }
    await auditService.record({
      actorId: actor.id,
      action: "destination.deleted",
      entityType: "destination",
      entityId: parsed.data,
    });
    revalidateCatalogue();
    return redirect({ href: "/admin/destinations", locale: await getLocale() });
  });

  if (inUse) {
    const t = await getTranslations("admin.destinationForm.delete");
    return fail(t("inUse"));
  }
  return result as ActionResult<never>;
}
