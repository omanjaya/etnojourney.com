import { Flame, Footprints, Hammer, House, Soup, type LucideIcon } from "lucide-react";
import type { TourCategory } from "@/server/db/schema";

export const categoryIcons: Record<TourCategory, LucideIcon> = {
  ritual: Flame,
  craft: Hammer,
  culinary: Soup,
  village: House,
  trekking: Footprints,
};

export const tourCategories = Object.keys(categoryIcons) as TourCategory[];
