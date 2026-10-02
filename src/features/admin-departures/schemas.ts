import { z } from "zod";
import {
  DEPARTURE_NOTE_MAX_LENGTH,
  isIsoDate,
  resolveDateRange,
} from "@/server/services/departure.rules";

const tourId = z.number({ error: "invalid" }).int().positive();
const date = z.string({ error: "date" }).refine(isIsoDate, "date");

export const departureKeySchema = z.object({ tourId, date });

export const assignGuideSchema = z.object({
  tourId,
  date,
  /** null unassigns the current guide. */
  guideId: z.number({ error: "invalid" }).int().positive().nullable(),
});

export const departureNoteSchema = z.object({
  tourId,
  date,
  /** Empty clears the note. */
  note: z
    .string({ error: "invalid" })
    .trim()
    .max(DEPARTURE_NOTE_MAX_LENGTH, "departureNote")
    .transform((value) => value || null),
});

export type DepartureKeyInput = z.input<typeof departureKeySchema>;
export type AssignGuideInput = z.input<typeof assignGuideSchema>;
export type DepartureNoteInput = z.input<typeof departureNoteSchema>;

/* ---------------------------------------------------------------- */
/* URL params                                                        */
/* ---------------------------------------------------------------- */

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export type DepartureQuery = {
  from: string;
  to: string;
  tourId?: number;
  withoutGuide: boolean;
  /** Whether the range differs from the default (today + 30 days). */
  custom: boolean;
};

/** `?from=&to=&tour=&noGuide=1` on /admin/departures; bad values fall back to defaults. */
export function parseDepartureQuery(raw: RawParams, today: string): DepartureQuery {
  const fromRaw = first(raw.from);
  const toRaw = first(raw.to);
  const range = resolveDateRange({ from: fromRaw, to: toRaw }, today);
  const tour = Number(first(raw.tour));
  const defaults = resolveDateRange({}, today);
  return {
    ...range,
    tourId: Number.isInteger(tour) && tour > 0 ? tour : undefined,
    withoutGuide: first(raw.noGuide) === "1",
    custom: range.from !== defaults.from || range.to !== defaults.to,
  };
}

/** Route segments of /admin/departures/[tourId]/[date]; null when malformed. */
export function parseDepartureParams(params: { tourId: string; date: string }) {
  const parsed = departureKeySchema.safeParse({
    tourId: /^\d+$/.test(params.tourId) ? Number(params.tourId) : NaN,
    date: params.date,
  });
  return parsed.success ? parsed.data : null;
}
