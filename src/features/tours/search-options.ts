/**
 * Client-safe tour search options. Keep this module free of Zod and any
 * `@/server/*` runtime import: it is bundled into the filter bar.
 */
import type { TourCategory } from "@/server/db/schema";
import type { FilterableIsland } from "@/lib/regions";

export const SORT_OPTIONS = ["popular", "priceAsc", "priceDesc", "duration", "longest"] as const;
export const PRICE_STEPS = [1_000_000, 2_500_000, 5_000_000, 15_000_000] as const;

/** Duration buckets offered in the filter (`duration` URL param). */
export const DURATION_BUCKETS = ["1", "2-3", "4+"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

/** Inclusive day range for a bucket (`max` undefined = no upper bound). */
export const DURATION_RANGES: Record<DurationBucket, { min: number; max?: number }> = {
  "1": { min: 1, max: 1 },
  "2-3": { min: 2, max: 3 },
  "4+": { min: 4 },
};

export type TourSortOption = (typeof SORT_OPTIONS)[number];

/** Validated `/tours` URL search params. */
export type TourSearch = {
  q?: string;
  category?: TourCategory;
  island?: FilterableIsland;
  destination?: string;
  maxPrice?: number;
  duration?: DurationBucket;
  sort?: TourSortOption;
};
