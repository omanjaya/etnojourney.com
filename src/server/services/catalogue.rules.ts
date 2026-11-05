import { can } from "@/server/auth/permissions";

/**
 * Pure rules for editing the catalogue (tours and destinations): who may see a
 * draft, edit versions that catch stale forms, which fields an edit changed,
 * and when a tour may be deleted. No server-only imports; tested with Vitest.
 */

/* ------------------------------------------------------------------ */
/* Comparing values                                                    */
/* ------------------------------------------------------------------ */

/**
 * JSON with object keys sorted, so `{ id, en }` from the form and `{ en, id }`
 * from a Postgres jsonb column compare equal. `undefined` counts as `null`.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** The keys (from `keys`, in that order) whose values differ between two records. */
export function changedFields<K extends string>(
  before: Partial<Record<K, unknown>>,
  after: Partial<Record<K, unknown>>,
  keys: readonly K[],
): K[] {
  return keys.filter((key) => canonicalJson(before[key]) !== canonicalJson(after[key]));
}

/**
 * Short, stable fingerprint of `keys` in a record. An edit form carries the
 * version it was opened with; the service refuses the save when the stored
 * record no longer has that version (someone else saved in between).
 */
export function recordVersion<K extends string>(
  record: Partial<Record<K, unknown>>,
  keys: readonly K[],
): string {
  return hash(canonicalJson(keys.map((key) => record[key])));
}

/** Two 32-bit FNV-1a style passes with different seeds, as 14 base-36 characters. */
function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995);
  }
  const part = (n: number) => (n >>> 0).toString(36).padStart(7, "0");
  return `${part(a)}${part(b)}`;
}

/* ------------------------------------------------------------------ */
/* Tours                                                               */
/* ------------------------------------------------------------------ */

/**
 * Columns the tour edit form saves. Publish and featured are not among them:
 * they are switched on their own (list or edit page), so a stale form can
 * never take a tour offline or put it back.
 */
export const TOUR_FORM_FIELDS = [
  "slug",
  "destinationId",
  "title",
  "summary",
  "description",
  "category",
  "durationDays",
  "durationHours",
  "pricePerPerson",
  "maxParticipants",
  "meetingPoint",
  "coverImage",
  "gallery",
  "highlights",
  "included",
  "difficulty",
  "notIncluded",
  "whatToBring",
  "etiquette",
  "itinerary",
] as const;

export type TourFormField = (typeof TOUR_FORM_FIELDS)[number];

/** A tour as the edit form sees it (itinerary as title/description pairs). */
export type EditableTour = Partial<Record<TourFormField, unknown>> & {
  slug: string;
  pricePerPerson: number;
  itinerary: readonly { title: unknown; description: unknown }[];
};

/** Itinerary rows reduced to what the form edits (no ids, day numbers or tour ids). */
export function itineraryForForm<T extends { title: unknown; description: unknown }>(
  days: readonly T[],
): { title: T["title"]; description: T["description"] }[] {
  return days.map(({ title, description }) => ({ title, description }));
}

export function tourVersion(tour: EditableTour): string {
  return recordVersion({ ...tour, itinerary: itineraryForForm(tour.itinerary) }, TOUR_FORM_FIELDS);
}

export function tourChanges(before: EditableTour, after: EditableTour): TourFormField[] {
  return changedFields(
    { ...before, itinerary: itineraryForForm(before.itinerary) },
    { ...after, itinerary: itineraryForForm(after.itinerary) },
    TOUR_FORM_FIELDS,
  );
}

/**
 * Audit details for a tour edit: the changed field names, plus the old and
 * new price and the old address when those changed (the disputes that matter).
 */
export function tourAuditDetails(
  before: EditableTour,
  after: EditableTour,
  fields: readonly TourFormField[],
): Record<string, unknown> {
  return {
    slug: after.slug,
    fields: [...fields],
    ...(fields.includes("pricePerPerson")
      ? { price: `${before.pricePerPerson} → ${after.pricePerPerson}` }
      : {}),
    ...(fields.includes("slug") ? { previousSlug: before.slug } : {}),
  };
}

/** Drafts are visible only to people who manage the catalogue (preview). */
export function canViewTour(isPublished: boolean, role: string | null | undefined): boolean {
  return isPublished || can(role, "catalogue.manage");
}

/**
 * A live tour keeps its address: shared links, search results and the content
 * sync all point at the slug. Unpublish first to rename it on purpose.
 */
export function slugChangeBlocked(
  current: { isPublished: boolean; slug: string },
  nextSlug: string,
): boolean {
  return current.isPublished && current.slug !== nextSlug;
}

export type TourRemovalBlocker = "published" | "hasBookings" | "hasReviews";

/**
 * Only an unpublished draft that nobody booked or reviewed can be deleted.
 * Bookings keep a tour (database restrict); reviews would be deleted with it.
 */
export function tourRemovalBlocker(tour: {
  isPublished: boolean;
  bookings: number;
  reviews: number;
}): TourRemovalBlocker | null {
  if (tour.isPublished) return "published";
  if (tour.bookings > 0) return "hasBookings";
  if (tour.reviews > 0) return "hasReviews";
  return null;
}

/** Slug for a copy: `<slug>-salinan`, kept within the 80-character limit. */
export function copySlug(slug: string): string {
  const suffix = "-salinan";
  return `${slug.slice(0, 80 - suffix.length).replace(/-+$/, "")}${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export const DESTINATION_FORM_FIELDS = [
  "slug",
  "name",
  "province",
  "tagline",
  "description",
  "heroImage",
  "gettingThere",
] as const;

export type DestinationFormField = (typeof DESTINATION_FORM_FIELDS)[number];

export type EditableDestination = Partial<Record<DestinationFormField, unknown>> & {
  slug: string;
};

export function destinationVersion(destination: EditableDestination): string {
  return recordVersion(destination, DESTINATION_FORM_FIELDS);
}

export function destinationChanges(
  before: EditableDestination,
  after: EditableDestination,
): DestinationFormField[] {
  return changedFields(before, after, DESTINATION_FORM_FIELDS);
}

export function destinationAuditDetails(
  before: EditableDestination,
  after: EditableDestination,
  fields: readonly DestinationFormField[],
): Record<string, unknown> {
  return {
    slug: after.slug,
    fields: [...fields],
    ...(fields.includes("slug") ? { previousSlug: before.slug } : {}),
  };
}
