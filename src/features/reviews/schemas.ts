import { z } from "zod";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_COUNTRY_MAX,
  REVIEW_PHOTOS_MAX,
  REVIEW_REPLY_MAX,
} from "@/server/services/review.rules";

/**
 * Messages are keys under `reviews.fields` (translated in the action),
 * except generic ones which fall back to `errors.fields`.
 */
export const createReviewSchema = z.object({
  bookingId: z.coerce.number().int().positive("invalid"),
  rating: z.coerce.number().int("rating").min(1, "rating").max(5, "rating"),
  body: z.string().trim().min(REVIEW_BODY_MIN, "bodyMin").max(REVIEW_BODY_MAX, "bodyMax"),
  country: z
    .string()
    .trim()
    .max(REVIEW_COUNTRY_MAX, "countryMax")
    .transform((value) => value || "Indonesia"),
});

export type CreateReviewValues = z.infer<typeof createReviewSchema>;

/** One uploaded photo as the review form sends it back (see uploadReviewPhotoAction). */
const reviewPhotoUploadSchema = z.object({
  path: z.string().max(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  receipt: z.string().max(100),
});

/**
 * The review form's hidden `photos` field: a JSON array of uploads. Missing or
 * empty means no photos; the server re-checks every receipt and path.
 */
export const reviewPhotosFieldSchema = z
  .string()
  .max(4000)
  .optional()
  .transform((value, ctx) => {
    if (!value) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "invalid" });
      return z.NEVER;
    }
  })
  .pipe(z.array(reviewPhotoUploadSchema).max(REVIEW_PHOTOS_MAX, "tooMany"));

export const reviewPhotoUploadTargetSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export const reviewPhotoIdSchema = z.object({
  photoId: z.number().int().positive(),
  isHidden: z.boolean(),
});

export const setReviewPublishedSchema = z.object({
  reviewId: z.number().int().positive(),
  isPublished: z.boolean(),
});

/** Messages are keys under `adminInsights.fields`. */
export const reviewReplySchema = z.object({
  reviewId: z.number().int().positive(),
  reply: z.string().trim().min(1, "replyRequired").max(REVIEW_REPLY_MAX, "replyMax"),
});

export const reviewIdSchema = z.object({ reviewId: z.number().int().positive() });

export const reviewFilterSchema = z
  .enum(["traveller", "curated", "hidden"])
  .optional()
  .catch(undefined);
