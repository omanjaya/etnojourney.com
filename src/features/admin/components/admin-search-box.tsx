"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | undefined>;

/**
 * Debounced `?q=` search for admin lists. Keeps the other params of the
 * current URL (passed in as `query`) and always resets pagination to page 1.
 */
export function AdminSearchBox({
  pathname,
  query,
  label,
  placeholder,
  clearLabel,
  className,
}: {
  pathname: string;
  query: Query;
  label: string;
  placeholder: string;
  clearLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  useEffect(() => {
    const next = value.trim();
    if (next === lastSubmitted.current) return;
    const id = setTimeout(() => {
      lastSubmitted.current = next;
      const params: Record<string, string> = {};
      for (const [key, v] of Object.entries(query)) {
        if (key !== "q" && key !== "page" && v) params[key] = v;
      }
      if (next) params.q = next;
      startTransition(() => router.replace({ pathname, query: params }, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
  }, [value, pathname, query, router]);

  return (
    <div role="search" className={cn("relative w-full sm:max-w-sm", className)}>
      <label htmlFor="admin-search" className="sr-only">
        {label}
      </label>
      <Search
        className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        id="admin-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        maxLength={100}
        autoComplete="off"
        className="border-line placeholder:text-muted/70 focus:border-terracotta focus:ring-terracotta/10 h-11 w-full rounded-full border bg-white pr-10 pl-11 text-sm transition-colors focus:ring-4 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute top-1/2 right-3 -translate-y-1/2">
        {pending ? (
          <LoaderCircle className="text-muted size-4 animate-spin" aria-hidden />
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-muted hover:text-ink grid size-7 place-items-center rounded-full"
            aria-label={clearLabel}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </span>
    </div>
  );
}
