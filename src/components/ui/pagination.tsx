import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type Query = Record<string, string | number | undefined>;

export type PaginationLabels = {
  /** Accessible name of the `<nav>`, e.g. "Halaman hasil". */
  nav: string;
  previous: string;
  next: string;
  /** Accessible name of a numbered link, e.g. (3) => "Halaman 3". */
  page: (page: number) => string;
};

/**
 * Prev/next plus numbered page links with ellipses. Server Component: links
 * keep every other query param and only change `page` (page 1 drops it so the
 * canonical first page has a clean URL). Renders nothing for a single page.
 */
export function Pagination({
  pathname,
  query,
  page,
  pageCount,
  labels,
  className,
}: {
  pathname: string;
  query: Query;
  page: number;
  pageCount: number;
  labels: PaginationLabels;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (key !== "page" && value !== undefined && value !== "") next[key] = String(value);
    }
    if (target > 1) next.page = String(target);
    return { pathname, query: next };
  };

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors";

  return (
    <nav aria-label={labels.nav} className={cn("flex justify-center", className)}>
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              className={cn(base, "border-line hover:border-ink/40 gap-1.5 border bg-white")}
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{labels.previous}</span>
              <span className="sr-only sm:hidden">{labels.previous}</span>
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(base, "border-line text-muted/60 gap-1.5 border opacity-60")}
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{labels.previous}</span>
            </span>
          )}
        </li>

        {pageItems(page, pageCount).map((item, i) =>
          item === "ellipsis" ? (
            <li key={`gap-${i}`} aria-hidden className="text-muted px-1">
              &hellip;
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={labels.page(item)}
                className={cn(
                  base,
                  "tabular-nums",
                  item === page ? "bg-ink text-sand-50" : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < pageCount ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              className={cn(base, "border-line hover:border-ink/40 gap-1.5 border bg-white")}
            >
              <span className="hidden sm:inline">{labels.next}</span>
              <span className="sr-only sm:hidden">{labels.next}</span>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(base, "border-line text-muted/60 gap-1.5 border opacity-60")}
            >
              <span className="hidden sm:inline">{labels.next}</span>
              <ChevronRight className="size-4" aria-hidden />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
