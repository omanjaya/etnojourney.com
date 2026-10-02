import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | undefined>;

/**
 * Link pills that set one query param (`param`) and keep the others, resetting
 * pagination. Server Component, so filtering works without JavaScript.
 */
export function FilterPills({
  pathname,
  query,
  param,
  label,
  options,
}: {
  pathname: string;
  query: Query;
  param: string;
  label: string;
  options: { value: string | undefined; label: string }[];
}) {
  const hrefFor = (value: string | undefined) => {
    const next: Record<string, string> = {};
    for (const [key, v] of Object.entries(query)) {
      if (key !== param && key !== "page" && v) next[key] = v;
    }
    if (value) next[param] = value;
    return { pathname, query: next };
  };

  return (
    <nav aria-label={label} className="mb-4 flex scrollbar-none gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const active = option.value === query[param];
        return (
          <Link
            key={option.value ?? "all"}
            href={hrefFor(option.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
              active
                ? "border-ink bg-ink text-sand-50"
                : "border-line text-ink-soft hover:border-sand-300 bg-white",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
