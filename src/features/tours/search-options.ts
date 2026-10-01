/**
 * Client-safe tour search options. Keep this module free of Zod and any
 * `@/server/*` runtime import: it is bundled into the filter bar.
 */
import type { TourCategory } from "@/server/db/schema";

export const SORT_OPTIONS = ["popular", "priceAsc", "priceDesc", "duration"] as const;
export const PRICE_STEPS = [1_000_000, 2_500_000, 5_000_000, 15_000_000] as const;
export const DURATION_STEPS = [1, 2, 3, 5] as const;

export type TourSortOption = (typeof SORT_OPTIONS)[number];

/** Validated `/tours` URL search params. */
export type TourSearch = {
  q?: string;
  category?: TourCategory;
  destination?: string;
  maxPrice?: number;
  maxDays?: number;
  sort?: TourSortOption;
};
