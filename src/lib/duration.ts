/**
 * How long a tour lasts, as a message key and count: same-day tours with a
 * length in hours read "2 hours", everything else "1 day" / "3 days".
 * Both keys exist in the `common` and `partner` namespaces.
 */
export function durationMessage(tour: { durationDays: number; durationHours: number | null }) {
  return tour.durationHours
    ? { key: "hours" as const, count: tour.durationHours }
    : { key: "days" as const, count: tour.durationDays };
}
