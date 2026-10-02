import { z } from "zod";
import { isUploadedImagePath } from "@/features/media/image-url";
import { resolvePeriod, type ReportPeriod } from "@/server/services/report.rules";

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** `?period=&from=&to=` for the reports page and its CSV export. */
export function parseReportQuery(raw: RawParams, today?: string): ReportPeriod {
  return resolvePeriod(
    { period: first(raw.period), from: first(raw.from), to: first(raw.to) },
    today,
  );
}

/** Search params that reproduce `period` in a URL (custom dates only when needed). */
export function reportQueryOf(period: ReportPeriod): Record<string, string> {
  return period.preset === "custom"
    ? { period: "custom", from: period.from, to: period.to }
    : { period: period.preset };
}

/* ---------------------------------------------------------------- */
/* Photo credits                                                     */
/* Messages are keys under `adminInsights.fields`, then `errors.fields`. */
/* ---------------------------------------------------------------- */

/** Absolute https URL (attribution links must not be javascript:, http: or relative). */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");
const httpsUrl = z.string().trim().max(500, "tooLong").refine(isHttpsUrl, "httpsUrl");

export const creditFieldsSchema = z.object({
  title: text(200),
  author: text(200),
  license: text(100),
  licenseUrl: z
    .string()
    .trim()
    .max(500, "tooLong")
    .refine((value) => value === "" || isHttpsUrl(value), "httpsUrl")
    .transform((value) => value || null),
  sourceUrl: httpsUrl,
  source: text(100),
});

export type CreditFields = z.infer<typeof creditFieldsSchema>;

/** Existing credits are addressed by their image path (the primary key). */
export const updateCreditSchema = creditFieldsSchema.extend({
  path: z.string().trim().min(1, "required").max(300, "invalid"),
});

/** New credits are only for images uploaded through the media pipeline. */
export const createCreditSchema = creditFieldsSchema.extend({
  path: z.string().trim().min(1, "required").refine(isUploadedImagePath, "uploadPath"),
});

const searchText = z.string().trim().min(1).max(100);

export function parseCreditQuery(raw: RawParams): { q?: string } {
  const q = searchText.safeParse(first(raw.q));
  return { q: q.success ? q.data : undefined };
}
