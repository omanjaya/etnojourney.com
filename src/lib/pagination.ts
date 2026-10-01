/** Page sizes used across list pages. */
export const PAGE_SIZE = {
  publicTours: 12,
  admin: 20,
} as const;

export type Paginated<T> = {
  items: T[];
  total: number;
  /** 1-based, already clamped to `1..pageCount`. */
  page: number;
  pageCount: number;
  pageSize: number;
};

/**
 * Reads a 1-based `page` search param. Anything that isn't a positive
 * integer (missing, "abc", "-2", "1.5", arrays) falls back to page 1.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 ? page : 1;
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Clamps a requested page into range (a page past the end shows the last page). */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, Math.floor(page)), pageCountFor(total, pageSize));
}

export function offsetFor(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Runs a count query, clamps the requested page, then loads that page.
 * The count runs first so an out-of-range page loads the last page instead
 * of an empty one.
 */
export async function paginate<T>(options: {
  page: number;
  pageSize: number;
  count: () => Promise<number>;
  load: (limit: number, offset: number) => Promise<T[]>;
}): Promise<Paginated<T>> {
  const total = await options.count();
  const page = clampPage(options.page, total, options.pageSize);
  const items =
    total === 0 ? [] : await options.load(options.pageSize, offsetFor(page, options.pageSize));
  return {
    items,
    total,
    page,
    pageCount: pageCountFor(total, options.pageSize),
    pageSize: options.pageSize,
  };
}

export type PageItem = number | "ellipsis";

/**
 * Compact page list: first, last, current ± `siblings`, with ellipses for gaps.
 * e.g. current 6 of 12 → [1, "ellipsis", 5, 6, 7, "ellipsis", 12]
 */
export function pageItems(current: number, pageCount: number, siblings = 1): PageItem[] {
  if (pageCount <= 5 + siblings * 2) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const start = Math.max(2, current - siblings);
  const end = Math.min(pageCount - 1, current + siblings);
  const items: PageItem[] = [1];
  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page++) items.push(page);
  if (end < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}
