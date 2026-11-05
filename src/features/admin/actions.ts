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
import type { TourRemovalBlocker } from "@/server/services/catalogue.rules";
import { DomainError, isDomainError } from "@/server/services/errors";
import { notificationService } from "@/server/services/notification.service";
import { tourService } from "@/server/services/tour.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  destinationFormSchema,
  destinationIdSchema,
  editVersionSchema,
  toggleTourSchema,
  tourFormSchema,
  tourIdSchema,
  updateBookingStatusSchema,
  type DestinationFormValues,
  type TourFormValues,
} from "./schemas";


/** Public pages that list or show tours, plus the admin catalogue. */
function revalidateCatalogue() {
  revalidate.everything();
}

/** What an edit form gets back after a save: whether anything changed, and its new version. */
export type SavedEdit = { changed: boolean; version: string };

/**
 * `runAction`, except that a taken or locked slug is also reported on the slug
 * field, so the form marks and focuses it instead of only showing the banner.
 */
async function runSlugAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  let slugError = false;
  const result = await runAction(async () => {
    try {
      return await fn();
    } catch (error) {
      if (isDomainError(error) && (error.code === "slugTaken" || error.code === "slugLocked")) {
        slugError = true;
      }
      throw error;
    }
  });
  if (!result.ok && slugError) return fail(result.error, { slug: [result.error] });
  return result;
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

/** Creates the tour, then opens it in the editor (with a "created" notice). */
export async function createTourAction(values: TourFormValues): Promise<ActionResult<never>> {
  const parsed = await parseInput(tourFormSchema, values);
  if (!parsed.success) return parsed.result;

  return runSlugAction(async () => {
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
    return redirect({
      href: { pathname: `/admin/tours/${tour.id}/edit`, query: { created: "1" } },
      locale: await getLocale(),
    });
  });
}

/**
 * Saves the tour edit form and stays on the page (the form shows "saved").
 * `version` is the edit version the form was opened with; a newer save by
 * someone else is refused with `staleEdit` instead of being overwritten.
 */
export async function updateTourAction(
  tourId: number,
  values: TourFormValues,
  version: string,
): Promise<ActionResult<SavedEdit>> {
  const parsed = await parseInput(tourFormSchema, values);
  if (!parsed.success) return parsed.result;

  return runSlugAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    if (!Number.isInteger(tourId) || tourId < 1) throw new DomainError("notFound");
    const expected = editVersionSchema.safeParse(version);
    if (!expected.success) throw new DomainError("staleEdit");
    // The service records the audit entry in the same transaction as the change.
    const saved = await tourService.update(actor.id, tourId, parsed.data, expected.data);
    if (saved.changed) revalidateCatalogue();
    return saved;
  });
}

/** Deletes an unused draft tour; anything else is refused with the reason. */
export async function deleteTourAction(tourId: number): Promise<ActionResult<never>> {
  const parsed = await parseInput(tourIdSchema, tourId);
  if (!parsed.success) return parsed.result;

  let blocker: TourRemovalBlocker | null = null;
  const result = await runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    const removed = await tourService.remove(actor.id, parsed.data);
    if (removed.status === "blocked") {
      blocker = removed.blocker;
      return;
    }
    revalidateCatalogue();
    return redirect({ href: "/admin/tours", locale: await getLocale() });
  });

  if (blocker) {
    const t = await getTranslations("admin.form.delete.blocked");
    return fail(t(blocker));
  }
  // Success redirects on the server, so only failures reach this point.
  return result as ActionResult<never>;
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

/**
 * Creates a destination (id = null, then opens it in the editor with a
 * "created" notice) or saves an edit (stays on the page; `version` guards
 * against overwriting someone else's newer save). A taken slug is reported on
 * the slug field rather than as a generic error.
 */
async function saveDestination<T>(
  id: number | null,
  values: DestinationFormValues,
  version: string | null,
): Promise<ActionResult<T>> {
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
    if (id !== null) {
      const expected = editVersionSchema.safeParse(version);
      if (!expected.success) throw new DomainError("staleEdit");
      // The service records the audit entry in the same transaction as the change.
      const saved = await destinationService.update(actor.id, id, parsed.data, expected.data);
      if (saved.changed) revalidateCatalogue();
      return saved;
    }
    const created = await destinationService.create(parsed.data);
    await auditService.record({
      actorId: actor.id,
      action: "destination.created",
      entityType: "destination",
      entityId: created.id,
      details: { slug: created.slug },
    });
    revalidateCatalogue();
    return redirect({
      href: { pathname: `/admin/destinations/${created.id}/edit`, query: { created: "1" } },
      locale: await getLocale(),
    });
  });

  if (slugTaken) {
    const t = await getTranslations("admin.destinationForm");
    return fail(t("slugTaken"), { slug: [t("slugTaken")] });
  }
  // Creating redirects on the server, so only failures and edits reach this point.
  return result as ActionResult<T>;
}

export async function createDestinationAction(
  values: DestinationFormValues,
): Promise<ActionResult<never>> {
  return saveDestination<never>(null, values, null);
}

export async function updateDestinationAction(
  destinationId: number,
  values: DestinationFormValues,
  version: string,
): Promise<ActionResult<SavedEdit>> {
  return saveDestination<SavedEdit>(destinationId, values, version);
}

/** Deletes a destination with no tours; the server re-checks even if the UI disabled it. */
export async function deleteDestinationAction(destinationId: number): Promise<ActionResult<never>> {
  const parsed = await parseInput(destinationIdSchema, destinationId);
  if (!parsed.success) return parsed.result;

  let inUse = false;
  const result = await runAction(async () => {
    const actor = await assertPermission("catalogue.manage");
    // The service records `destination.deleted` (with slug and name) in its transaction.
    if ((await destinationService.remove(actor.id, parsed.data)) === "inUse") {
      inUse = true;
      return;
    }
    revalidateCatalogue();
    return redirect({ href: "/admin/destinations", locale: await getLocale() });
  });

  if (inUse) {
    const t = await getTranslations("admin.destinationForm.delete");
    return fail(t("inUse"));
  }
  return result as ActionResult<never>;
}
