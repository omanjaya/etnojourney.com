/**
 * The tour form's sections in page order. Each key is a label under
 * `admin.form.sections` and, through `tourSectionId`, the section's anchor id
 * used by the jump bar at the top of the form. Each section component sets
 * the same id (`tour-<key>`) on its <Section>.
 */
export const tourSections = [
  "basics",
  "details",
  "media",
  "lists",
  "practical",
  "itinerary",
  "visibility",
] as const;

export type TourSectionKey = (typeof tourSections)[number];

export const tourSectionId = (key: TourSectionKey) => `tour-${key}`;
