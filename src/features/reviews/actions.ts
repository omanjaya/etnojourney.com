"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { assertPermission, getCurrentUser } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import { reviewService, type ReviewPhotoUpload } from "@/server/services/review.service";
import { REVIEW_PHOTO_MAX_BYTES, REVIEW_PHOTO_UPLOAD_LIMIT } from "@/server/services/review.rules";
import { ImageRejectedError } from "@/server/storage/image-processing";
import { createRateLimiter } from "@/features/auth/rate-limit";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  createReviewSchema,
  reviewIdSchema,
  reviewPhotoIdSchema,
  reviewPhotosFieldSchema,
  reviewPhotoUploadTargetSchema,
  reviewReplySchema,
  setReviewPublishedSchema,
} from "./schemas";

/** Per traveller; sharp re-encoding is the expensive part this protects. */
const photoUploadLimiter = createRateLimiter();

export async function createReviewAction(
  _prev: ActionResult<{ tourSlug: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ tourSlug: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail((await getTranslations("errors"))("unauthorized"));

  const parsed = await parseInput(createReviewSchema, Object.fromEntries(formData), {
    fieldsNamespace: "reviews.fields",
  });
  if (!parsed.success) return parsed.result;

  const photos = reviewPhotosFieldSchema.safeParse(formData.get("photos") ?? undefined);
  if (!photos.success) {
    const t = await getTranslations("community.photos.errors");
    const tooMany = photos.error.issues.some((issue) => issue.message === "tooMany");
    return fail(t(tooMany ? "tooMany" : "invalid"));
  }

  // Explain *why* a booking can't be reviewed instead of a generic "forbidden".
  const verdict = await reviewService.eligibility(user.id, parsed.data.bookingId);
  if (verdict !== "ok") {
    const t = await getTranslations("reviews.errors");
    return fail(t(verdict));
  }

  const locale = await getLocale();
  return runAction(async () => {
    const { tourSlug } = await reviewService.create(
      { id: user.id, name: user.name },
      { ...parsed.data, language: locale, photos: photos.data },
    );
    revalidate.tourDetails();
    revalidate.account();
    revalidate.home();
    return { tourSlug };
  });
}

export async function setReviewPublishedAction(
  reviewId: number,
  isPublished: boolean,
): Promise<ActionResult<{ isPublished: boolean }>> {
  const parsed = await parseInput(setReviewPublishedSchema, { reviewId, isPublished });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("reviews.manage");
    const { review } = await reviewService.setPublished(
      parsed.data.reviewId,
      parsed.data.isPublished,
    );
    await auditService.record({
      actorId: actor.id,
      action: review.isPublished ? "review.published" : "review.hidden",
      entityType: "review",
      entityId: review.id,
    });
    revalidate.everything();
    return { isPublished: review.isPublished };
  });
}

export type ReviewReplyState = { reply: string | null; repliedAt: string | null };

/** Saves the team's public reply under a review (1-2000 characters). */
export async function saveReviewReplyAction(
  reviewId: number,
  reply: string,
): Promise<ActionResult<ReviewReplyState>> {
  const parsed = await parseInput(
    reviewReplySchema,
    { reviewId, reply },
    { fieldsNamespace: "adminInsights.fields" },
  );
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("reviews.manage");
    const { review, hadReply } = await reviewService.setReply(
      parsed.data.reviewId,
      actor.id,
      parsed.data.reply,
    );
    await auditService.record({
      actorId: actor.id,
      action: "review.replied",
      entityType: "review",
      entityId: review.id,
      details: { change: hadReply ? "edited" : "added", length: parsed.data.reply.length },
    });
    revalidate.tourDetails();
    revalidate.admin();
    return { reply: review.reply, repliedAt: review.repliedAt?.toISOString() ?? null };
  });
}

/** Removes the team's reply from a review. */
export async function removeReviewReplyAction(
  reviewId: number,
): Promise<ActionResult<ReviewReplyState>> {
  const parsed = await parseInput(reviewIdSchema, { reviewId });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("reviews.manage");
    const { review, hadReply } = await reviewService.setReply(parsed.data.reviewId, actor.id, null);
    if (hadReply) {
      await auditService.record({
        actorId: actor.id,
        action: "review.replied",
        entityType: "review",
        entityId: review.id,
        details: { change: "removed" },
      });
    }
    revalidate.tourDetails();
    revalidate.admin();
    return { reply: null, repliedAt: null };
  });
}

type PhotoOutcome = { photo: ReviewPhotoUpload } | { rejected: ImageRejectedError["reason"] };

/**
 * Traveller: uploads one photo for the review they are writing. Requires the
 * signed-in owner of the completed, not yet reviewed booking; the file is
 * validated by content and re-encoded server-side. The returned receipt is
 * what lets `createReviewAction` link the photo to the review.
 */
export async function uploadReviewPhotoAction(
  formData: FormData,
): Promise<ActionResult<ReviewPhotoUpload>> {
  const user = await getCurrentUser();
  if (!user) return fail((await getTranslations("errors"))("unauthorized"));

  const parsed = await parseInput(reviewPhotoUploadTargetSchema, {
    bookingId: formData.get("bookingId"),
  });
  if (!parsed.success) return parsed.result;

  const file = formData.get("file");
  const tm = await getTranslations("media.errors");
  if (!(file instanceof File) || file.size === 0) return fail(tm("empty"));
  if (file.size > REVIEW_PHOTO_MAX_BYTES) return fail(tm("tooLarge"));

  const verdict = await reviewService.eligibility(user.id, parsed.data.bookingId);
  if (verdict !== "ok") return fail((await getTranslations("reviews.errors"))(verdict));

  if (!photoUploadLimiter.hit(`reviewPhoto:${user.id}`, REVIEW_PHOTO_UPLOAD_LIMIT)) {
    return fail((await getTranslations("community.photos.errors"))("rateLimited"));
  }

  const result = await runAction<PhotoOutcome>(async () => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return { photo: await reviewService.uploadPhoto(user.id, parsed.data.bookingId, bytes) };
    } catch (error) {
      if (error instanceof ImageRejectedError) return { rejected: error.reason };
      throw error;
    }
  });
  if (!result.ok) return result;
  if ("rejected" in result.data) return fail(tm(result.data.rejected));
  return ok(result.data.photo);
}

/** Admin: hides or shows one traveller photo under a review. */
export async function setReviewPhotoHiddenAction(
  photoId: number,
  isHidden: boolean,
): Promise<ActionResult<{ isHidden: boolean }>> {
  const parsed = await parseInput(reviewPhotoIdSchema, { photoId, isHidden });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("reviews.manage");
    const { photo, changed } = await reviewService.setPhotoHidden(
      parsed.data.photoId,
      parsed.data.isHidden,
    );
    if (changed) {
      await auditService.record({
        actorId: actor.id,
        action: photo.isHidden ? "review.photo_hidden" : "review.photo_shown",
        entityType: "review",
        entityId: photo.reviewId,
        details: { photoId: photo.id, position: photo.position },
      });
    }
    revalidate.tourDetails();
    revalidate.admin();
    return { isHidden: photo.isHidden };
  });
}
