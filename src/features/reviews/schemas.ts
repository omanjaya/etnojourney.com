import { z } from "zod";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_COUNTRY_MAX,
} from "@/server/services/review.rules";

/**
 * Messages are keys under `reviews.fields` (translated in the action),
 * except generic ones which fall back to `errors.fields`.
 */
export const createReviewSchema = z.object({
  bookingId: z.coerce.number().int().positive("invalid"),
  rating: z.coerce.number().int("rating").min(1, "rating").max(5, "rating"),
  body: z
    .string()
    .trim()
    .min(REVIEW_BODY_MIN, "bodyMin")
    .max(REVIEW_BODY_MAX, "bodyMax"),
  country: z
    .string()
    .trim()
    .max(REVIEW_COUNTRY_MAX, "countryMax")
    .transform((value) => value || "Indonesia"),
});

export type CreateReviewValues = z.infer<typeof createReviewSchema>;

export const setReviewPublishedSchema = z.object({
  reviewId: z.number().int().positive(),
  isPublished: z.boolean(),
});

export const reviewFilterSchema = z
  .enum(["traveller", "curated", "hidden"])
  .optional()
  .catch(undefined);
