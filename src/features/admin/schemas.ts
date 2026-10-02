import { z } from "zod";
import { isAllowedImageSource } from "@/features/media/image-url";
import { bookingStatus, tourCategory, tourDifficulty } from "@/server/db/schema";

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

/* ---------------------------------------------------------------- */
/* List filters (URL search params)                                  */
/* ---------------------------------------------------------------- */

type RawParams = Record<string, string | string[] | undefined>;

/** Each param is validated on its own; an invalid one is dropped, not fatal. */
const optionalParam = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const flatten = (raw: RawParams) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

/** A real calendar date in YYYY-MM-DD (rejects 2026-02-30). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  });

const searchText = z.string().trim().min(1).max(100);

export const ADMIN_BOOKING_SORTS = ["created", "travel"] as const;

const adminBookingQuerySchema = z.object({
  q: optionalParam(searchText),
  status: optionalParam(bookingStatusSchema),
  from: optionalParam(isoDate),
  to: optionalParam(isoDate),
  sort: optionalParam(z.enum(ADMIN_BOOKING_SORTS)),
});

export type AdminBookingQuery = z.infer<typeof adminBookingQuerySchema>;

/** Admin bookings filters from the URL (page and export share this). */
export function parseAdminBookingQuery(raw: RawParams): AdminBookingQuery {
  const query = adminBookingQuerySchema.parse(flatten(raw));
  // A reversed range is almost certainly a typo; swap rather than show nothing.
  if (query.from && query.to && query.from > query.to) {
    return { ...query, from: query.to, to: query.from };
  }
  return query;
}

const adminListQuerySchema = z.object({ q: optionalParam(searchText) });

/** `?q=` on the simpler admin lists (tours, reviews, destinations). */
export function parseAdminListQuery(raw: RawParams): { q?: string } {
  return adminListQuerySchema.parse(flatten(raw));
}

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
  // Practical "before you go" info (limits match src/server/db/content.ts).
  difficulty: z.enum(tourDifficulty.enumValues, { error: "required" }),
  notIncluded: z.array(localized(160)).max(6, "invalid"),
  whatToBring: z.array(localized(160)).max(8, "invalid"),
  etiquette: z.array(localized(200)).max(6, "invalid"),
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
  /** Optional: both locales empty means "not set"; one filled means both required. */
  gettingThere: z.preprocess(
    (value) =>
      value &&
      typeof value === "object" &&
      "id" in value &&
      "en" in value &&
      !String(value.id).trim() &&
      !String(value.en).trim()
        ? null
        : value,
    localized(1000).nullable(),
  ),
});

export type DestinationFormValues = z.input<typeof destinationFormSchema>;

export const destinationIdSchema = z.number().int().positive();
