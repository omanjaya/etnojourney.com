import { z } from "zod";
import { isAllowedImageSource } from "@/features/media/image-url";
import { bookingStatus, tourCategory } from "@/server/db/schema";

const localized = (max: number) =>
  z.object({
    id: z.string().trim().min(1, "required").max(max, "invalid"),
    en: z.string().trim().min(1, "required").max(max, "invalid"),
  });

/** Unsplash CDN URLs or images uploaded through the media pipeline. */
const imageSource = z
  .string()
  .trim()
  .min(1, "required")
  .max(500, "url")
  .refine(isAllowedImageSource, "url");

const intIn = (min: number, max: number) =>
  z.coerce
    .number({ error: "positive" })
    .int({ error: "invalid" })
    .min(min, "positive")
    .max(max, "invalid");

export const bookingStatusSchema = z.enum(bookingStatus.enumValues, { error: "invalid" });

export const updateBookingStatusSchema = z.object({
  bookingId: z.number().int().positive(),
  status: bookingStatusSchema,
});

export const toggleTourSchema = z.object({
  tourId: z.number().int().positive(),
  value: z.boolean(),
});

/** Optional `?status=` filter on the admin bookings page; invalid values fall back to all. */
export const bookingFilterSchema = bookingStatusSchema.optional().catch(undefined);

export const tourFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "required")
    .max(80, "slug")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
  destinationId: intIn(1, Number.MAX_SAFE_INTEGER),
  title: localized(120),
  summary: localized(300),
  description: localized(5000),
  category: z.enum(tourCategory.enumValues, { error: "required" }),
  durationDays: intIn(1, 30),
  pricePerPerson: intIn(1, 1_000_000_000),
  maxParticipants: intIn(1, 100),
  meetingPoint: z.string().trim().min(2, "required").max(200, "invalid"),
  coverImage: imageSource,
  gallery: z.array(imageSource).max(12, "invalid"),
  highlights: z.array(localized(160)).max(12, "invalid"),
  included: z.array(localized(160)).max(20, "invalid"),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  itinerary: z
    .array(z.object({ title: localized(120), description: localized(1500) }))
    .min(1, "required")
    .max(30, "invalid"),
});

export type TourFormValues = z.input<typeof tourFormSchema>;

export const destinationFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "required")
    .max(80, "slug")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
  name: z.string().trim().min(2, "required").max(80, "invalid"),
  province: z.string().trim().min(2, "required").max(80, "invalid"),
  tagline: localized(200),
  description: localized(5000),
  heroImage: imageSource,
});

export type DestinationFormValues = z.input<typeof destinationFormSchema>;

export const destinationIdSchema = z.number().int().positive();
