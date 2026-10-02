import { z } from "zod";
import { FILTERABLE_ISLANDS } from "@/lib/regions";
import { tourCategory } from "@/server/db/schema";
import type { TourFilters } from "@/server/services/tour.service";
import {
  DURATION_BUCKETS,
  DURATION_RANGES,
  SORT_OPTIONS,
  type DurationBucket,
  type TourSearch,
} from "./search-options";

export type { TourSearch } from "./search-options";

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/** Each param is validated on its own so one bad value doesn't discard the rest. */
const tourSearchSchema = z.object({
  q: optional(z.string().trim().min(1).max(80)),
  category: optional(z.enum(tourCategory.enumValues)),
  island: optional(z.enum(FILTERABLE_ISLANDS)),
  destination: optional(z.string().regex(/^[a-z0-9-]{1,60}$/)),
  maxPrice: optional(z.coerce.number().int().positive().max(1_000_000_000)),
  duration: optional(z.enum(DURATION_BUCKETS)),
  /** Legacy "up to N days" links, mapped onto the closest bucket. */
  maxDays: optional(z.coerce.number().int().positive().max(60)),
  sort: optional(z.enum(SORT_OPTIONS)),
});

/** Closest duration bucket for an old `maxDays` link. */
export function bucketForMaxDays(maxDays: number): DurationBucket {
  if (maxDays <= 1) return "1";
  if (maxDays <= 3) return "2-3";
  return "4+";
}

export function parseTourSearch(raw: Record<string, string | string[] | undefined>): TourSearch {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const { maxDays, ...search } = tourSearchSchema.parse(flat);
  const duration = search.duration ?? (maxDays ? bucketForMaxDays(maxDays) : undefined);
  return Object.fromEntries(
    Object.entries({ ...search, duration }).filter(([, value]) => value !== undefined),
  ) as TourSearch;
}

export function toTourFilters(search: TourSearch): TourFilters {
  const range = search.duration ? DURATION_RANGES[search.duration] : undefined;
  return {
    query: search.q,
    category: search.category,
    island: search.island,
    destinationSlug: search.destination,
    maxPrice: search.maxPrice,
    minDays: range?.min,
    maxDays: range?.max,
    sort: search.sort,
  };
}
