import { z } from "zod";
import { isoDateFromToday } from "@/lib/format";
import {
  addMonths,
  closureRangeIssue,
  isMonthInRange,
  MAX_MONTHS_AHEAD,
  monthOf,
} from "@/server/services/availability.rules";

const isoDate = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "date")
  // Rejects impossible dates such as 2026-02-30.
  .refine((value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), "date");

/** A tour id, or `null` for "all tours". */
const scope = z.number().int().positive().nullable();

const rangeShape = { tourId: scope, from: isoDate, to: isoDate };

/** Evaluated per request so "today" is always current (Asia/Jakarta). */
function checkRange(value: { from: string; to: string }, ctx: z.RefinementCtx) {
  const issue = closureRangeIssue({ ...value, today: isoDateFromToday(0) });
  if (issue) {
    ctx.addIssue({
      code: "custom",
      message: issue,
      path: [issue === "closurePast" ? "from" : "to"],
    });
  }
}

export const closureRangeSchema = z.object(rangeShape).superRefine(checkRange);

export const closeDatesSchema = z
  .object({
    ...rangeShape,
    reason: z
      .string()
      .trim()
      .max(200, "closureReason")
      .optional()
      .transform((value) => value || null),
  })
  .superRefine(checkRange);

export const reopenSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "required").max(500, "invalid"),
});

export type ClosureRangeValues = z.input<typeof closureRangeSchema>;
export type CloseDatesValues = z.input<typeof closeDatesSchema>;

/** `?tour=` and `?month=` on /admin/availability; bad values fall back to defaults. */
export function parseAvailabilityQuery(raw: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const today = isoDateFromToday(0);
  const current = monthOf(today);

  const tourRaw = first(raw.tour);
  const tourId = tourRaw && /^\d{1,9}$/.test(tourRaw) ? Number(tourRaw) : null;

  const monthRaw = first(raw.month);
  const month =
    monthRaw && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw) && isMonthInRange(monthRaw, today)
      ? monthRaw
      : current;

  return {
    tourId,
    month,
    minMonth: current,
    maxMonth: addMonths(current, MAX_MONTHS_AHEAD),
    today,
  };
}
