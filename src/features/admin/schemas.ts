import { z } from "zod";
import { isAllowedImageSource } from "@/features/media/image-url";
import { bookingStatus, tourCategory, tourDifficulty } from "@/server/db/schema";
import { REFUND_MODES } from "@/server/services/booking.rules";

/** Required in both languages; a missing English side says so in its message. */
const localized = (max: number) =>
  z.object({
    id: z.string().trim().min(1, "required").max(max, "tooLong"),
    en: z.string().trim().min(1, "englishRequired").max(max, "tooLong"),
  });

/**
 * A bilingual list edited as one line per item per language. The form pairs
 * ID and EN lines by position and drops blank lines, so an empty side only
 * happens when the two columns have a different number of lines.
 */
const bilingualList = (lineMax: number, maxLines: number) =>
  z
    .array(
      z.object({
        id: z.string().trim().min(1, "linesMismatch").max(lineMax, "lineTooLong"),
        en: z.string().trim().min(1, "linesMismatch").max(lineMax, "lineTooLong"),
      }),
    )
    .max(maxLines, "tooManyLines");

/** Unsplash CDN URLs or images uploaded through the media pipeline. */
const imageSource = z
  .string()
  .trim()
  .min(1, "required")
  .max(500, "url")
  .refine(isAllowedImageSource, "url");

/** Whole number in [min, max]. Every failure shows `message`, which states the range. */
const intIn = (min: number, max: number, message: string) =>
  z.coerce.number({ error: message }).int({ error: message }).min(min, message).max(max, message);

/**
 * Lets a cross-field check run while unrelated fields still fail, so the
 * operator sees every problem after one save. It still waits for the fields
 * it reads to parse. A `when` replaces Zod's own "skip after a fatal issue"
 * guard, so an issue without a field (the input is not an object at all)
 * also stops the check; otherwise it would read properties of `null`.
 */
const afterFields =
  (...fields: string[]) =>
  (payload: z.core.ParsePayload) =>
    !payload.issues.some((issue) => {
      const field = issue.path?.[0];
      return field === undefined || fields.includes(String(field));
    });

export const bookingStatusSchema = z.enum(bookingStatus.enumValues, { error: "invalid" });

export const updateBookingStatusSchema = z.object({
  bookingId: z.number().int().positive(),
  status: bookingStatusSchema,
  /** For cancelling a paid booking: the policy share or a full refund. */
  refund: z.enum(REFUND_MODES, { error: "invalid" }).optional(),
});

export const toggleTourSchema = z.object({
  tourId: z.number().int().positive(),
  value: z.boolean(),
});

export const tourIdSchema = z.number().int().positive();

/** The edit version a form was opened with (see catalogue.rules `recordVersion`). */
export const editVersionSchema = z.string().regex(/^[0-9a-z]{1,32}$/);

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

export const ADMIN_TOUR_STATUSES = ["published", "draft"] as const;

const adminTourQuerySchema = z.object({
  q: optionalParam(searchText),
  status: optionalParam(z.enum(ADMIN_TOUR_STATUSES)),
  destination: optionalParam(
    z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
  ),
});

export type AdminTourQuery = z.infer<typeof adminTourQuerySchema>;

/** Admin tour list: `?q=`, `?status=published|draft` and `?destination=<slug>`. */
export function parseAdminTourQuery(raw: RawParams): AdminTourQuery {
  return adminTourQuerySchema.parse(flatten(raw));
}

export const tourFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "required")
      .max(80, "slug")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
    // The form sends 0 when nothing is chosen.
    destinationId: intIn(1, Number.MAX_SAFE_INTEGER, "choose"),
    title: localized(120),
    summary: localized(300),
    description: localized(5000),
    category: z.enum(tourCategory.enumValues, { error: "choose" }),
    durationDays: intIn(1, 30, "durationDays"),
    /** Same-day tours only; empty means the tour fills the day(s). */
    durationHours: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      intIn(1, 12, "durationHours").nullable(),
    ),
    // The floor catches a price typed in thousands ("450" for Rp 450.000).
    pricePerPerson: z.coerce
      .number({ error: "priceMin" })
      .int({ error: "priceMin" })
      .min(10_000, "priceMin")
      .max(1_000_000_000, "priceMax"),
    maxParticipants: intIn(1, 100, "maxParticipants"),
    meetingPoint: z.string().trim().min(2, "required").max(200, "tooLong"),
    coverImage: imageSource,
    gallery: z.array(imageSource).max(12, "tooManyPhotos"),
    highlights: bilingualList(160, 12),
    // An empty list would leave a bare "Included" heading on the tour page.
    included: bilingualList(160, 20).min(1, "includedRequired"),
    // Practical "before you go" info (limits match src/server/db/content.ts).
    difficulty: z.enum(tourDifficulty.enumValues, { error: "choose" }),
    notIncluded: bilingualList(160, 6),
    whatToBring: bilingualList(160, 8),
    etiquette: bilingualList(200, 6),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    itinerary: z
      .array(z.object({ title: localized(120), description: localized(1500) }))
      .min(1, "itineraryDays")
      .max(30, "itineraryDays"),
  })
  .refine((t) => t.durationHours === null || t.durationDays === 1, {
    message: "durationHoursSameDay",
    path: ["durationHours"],
    when: afterFields("durationDays", "durationHours"),
  })
  // One itinerary entry per day, as content JSON requires (src/server/db/content.ts).
  .refine((t) => !Array.isArray(t.itinerary) || t.itinerary.length === t.durationDays, {
    message: "itineraryDays",
    path: ["itinerary"],
    when: afterFields("durationDays"),
  });

export type TourFormValues = z.input<typeof tourFormSchema>;

export const destinationFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "required")
    .max(80, "slug")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
  name: z.string().trim().min(2, "required").max(80, "tooLong"),
  province: z.string().trim().min(2, "required").max(80, "tooLong"),
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
