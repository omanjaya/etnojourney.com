"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { fail, type ActionResult } from "@/lib/action-result";
import { assertPermission, getCurrentUser } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import { reviewService } from "@/server/services/review.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  createReviewSchema,
  reviewIdSchema,
  reviewReplySchema,
  setReviewPublishedSchema,
} from "./schemas";

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
      { ...parsed.data, language: locale },
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
