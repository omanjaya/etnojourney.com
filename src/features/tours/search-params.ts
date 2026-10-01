import { z } from "zod";
import { tourCategory } from "@/server/db/schema";
import type { TourFilters } from "@/server/services/tour.service";
import { SORT_OPTIONS, type TourSearch } from "./search-options";

export type { TourSearch } from "./search-options";

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/** Each param is validated on its own so one bad value doesn't discard the rest. */
const tourSearchSchema = z.object({
  q: optional(z.string().trim().min(1).max(80)),
  category: optional(z.enum(tourCategory.enumValues)),
  destination: optional(z.string().regex(/^[a-z0-9-]{1,60}$/)),
  maxPrice: optional(z.coerce.number().int().positive().max(1_000_000_000)),
  maxDays: optional(z.coerce.number().int().positive().max(60)),
  sort: optional(z.enum(SORT_OPTIONS)),
});

export function parseTourSearch(raw: Record<string, string | string[] | undefined>): TourSearch {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  return tourSearchSchema.parse(flat);
}

export function toTourFilters(search: TourSearch): TourFilters {
  return {
    query: search.q,
    category: search.category,
    destinationSlug: search.destination,
    maxPrice: search.maxPrice,
    maxDays: search.maxDays,
    sort: search.sort,
  };
}
