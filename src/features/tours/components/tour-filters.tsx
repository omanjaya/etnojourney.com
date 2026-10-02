"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/format";
import { FILTERABLE_ISLANDS, type Island } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { categoryIcons, tourCategories } from "@/components/shared/category-icon";
import { DURATION_BUCKETS, PRICE_STEPS, SORT_OPTIONS, type TourSearch } from "../search-options";

type DestinationOption = { slug: string; name: string; group?: string; island?: Island };

type Props = {
  search: TourSearch;
  /** Total results for the current filters (shown on the mobile apply button). */
  total: number;
  /** Destination options, already ordered; `group` (island label) renders optgroups. */
  destinations: DestinationOption[];
};

const DESKTOP_QUERY = "(min-width: 1024px)";

export function TourFilters({ search, total, destinations }: Props) {
  const t = useTranslations("tours.filters");
  const tc = useTranslations("common.categories");
  const ti = useTranslations("common.islands");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search.q ?? "");
  const [open, setOpen] = useState(false);
  const firstRender = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const apply = (patch: Partial<TourSearch>) => {
    const next = { ...search, ...patch };
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== "") params[key] = String(value);
    }
    startTransition(() => {
      router.replace({ pathname: "/tours", query: params }, { scroll: false });
    });
  };

  // Debounce free-text search so we don't hit the server on every keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => apply({ q: query.trim() || undefined }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const closeSheet = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  // Mobile bottom sheet: lock page scroll, focus the first field, and close if
  // the viewport grows to desktop (where the panel is inline).
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    if (desktop.matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("select")?.focus();
    const onChange = () => desktop.matches && setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open || window.matchMedia(DESKTOP_QUERY).matches) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== "Tab") return;
    // Keep keyboard focus inside the sheet while it is open.
    const focusable = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>("button, select, a[href]") ?? []),
    ].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const destinationOptions = search.island
    ? destinations.filter((d) => d.island === search.island)
    : destinations;
  const activeCount = [search.island, search.destination, search.maxPrice, search.duration].filter(
    Boolean,
  ).length;
  const hasAny = Boolean(search.q || search.category || activeCount);

  const clearAll = () => {
    setQuery("");
    startTransition(() => router.replace("/tours", { scroll: false }));
  };

  return (
    <div
      className={cn("space-y-5 transition-opacity short:space-y-3", pending && "opacity-70")}
      aria-busy={pending}
    >
      {/* Category pills: always visible, also on phones. */}
      <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <CategoryPill active={!search.category} onClick={() => apply({ category: undefined })}>
          {t("allCategories")}
        </CategoryPill>
        {tourCategories.map((category) => {
          const Icon = categoryIcons[category];
          return (
            <CategoryPill
              key={category}
              active={search.category === category}
              onClick={() => apply({ category })}
            >
              <Icon className="size-4" aria-hidden />
              {tc(category)}
            </CategoryPill>
          );
        })}
      </div>

      <div className="flex gap-3 lg:items-end">
        <div className="relative flex-1 lg:max-w-xs xl:max-w-sm">
          <Label htmlFor="tour-search" className="sr-only">
            {t("search")}
          </Label>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="tour-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-11 short:h-10"
            maxLength={80}
          />
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="tour-filter-panel"
          aria-label={
            activeCount > 0
              ? `${t("toggle")}, ${t("activeFilters", { count: activeCount })}`
              : undefined
          }
          className="border-line inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("toggle")}
          {activeCount > 0 && (
            <span
              aria-hidden
              className="bg-terracotta grid size-5 place-items-center rounded-full text-[11px] text-white"
            >
              {activeCount}
            </span>
          )}
        </button>

        {/* Mobile: dimmed backdrop behind the bottom sheet. */}
        {open && (
          <div
            aria-hidden
            onClick={closeSheet}
            className="bg-ink/40 animate-fade-in fixed inset-0 z-40 lg:hidden"
          />
        )}

        <div
          id="tour-filter-panel"
          ref={panelRef}
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-labelledby={open ? "tour-filter-title" : undefined}
          onKeyDown={onPanelKeyDown}
          className={cn(
            // Phone: bottom sheet. Desktop: inline row after the search box.
            "bg-sand-50 fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl shadow-[0_-20px_60px_-20px_rgb(29_26_22/0.35)]",
            "lg:static lg:z-auto lg:max-h-none lg:flex-1 lg:rounded-none lg:bg-transparent lg:shadow-none",
            open ? "animate-fade-up" : "hidden lg:flex",
          )}
        >
          <div className="border-line flex items-center justify-between border-b px-5 py-4 lg:hidden">
            <h2 id="tour-filter-title" className="font-sans text-base font-semibold">
              {t("sheetTitle")}
            </h2>
            <button
              type="button"
              onClick={closeSheet}
              aria-label={t("close")}
              className="hover:bg-sand-100 grid size-10 place-items-center rounded-full"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:gap-3 lg:overflow-visible lg:p-0">
            <FilterSelect
              id="filter-island"
              label={t("island")}
              value={search.island ?? ""}
              onChange={(v) => {
                const island = (v || undefined) as TourSearch["island"];
                const keepsDestination =
                  !island ||
                  !search.destination ||
                  destinations.some((d) => d.slug === search.destination && d.island === island);
                apply({ island, destination: keepsDestination ? search.destination : undefined });
              }}
            >
              <option value="">{t("allIslands")}</option>
              {FILTERABLE_ISLANDS.filter((island) =>
                destinations.some((d) => d.island === island),
              ).map((island) => (
                <option key={island} value={island}>
                  {ti(island)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-destination"
              label={t("destination")}
              value={search.destination ?? ""}
              onChange={(v) => apply({ destination: v || undefined })}
            >
              <option value="">{t("allDestinations")}</option>
              {groupOptions(destinationOptions).map(({ group, options }) =>
                group ? (
                  <optgroup key={group} label={group}>
                    {options.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  options.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))
                ),
              )}
            </FilterSelect>

            <FilterSelect
              id="filter-price"
              label={t("maxPrice")}
              value={search.maxPrice?.toString() ?? ""}
              onChange={(v) => apply({ maxPrice: v ? Number(v) : undefined })}
            >
              <option value="">{t("anyPrice")}</option>
              {PRICE_STEPS.map((p) => (
                <option key={p} value={p}>
                  {t("upTo", { price: formatCurrency(p, locale) })}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-duration"
              label={t("duration")}
              value={search.duration ?? ""}
              onChange={(v) => apply({ duration: (v || undefined) as TourSearch["duration"] })}
            >
              <option value="">{t("anyDuration")}</option>
              {DURATION_BUCKETS.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {t(`durationBuckets.${bucket}`)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-sort"
              label={t("sort")}
              value={search.sort ?? "popular"}
              onChange={(v) =>
                apply({ sort: v === "popular" ? undefined : (v as TourSearch["sort"]) })
              }
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`sortOptions.${s}`)}
                </option>
              ))}
            </FilterSelect>

            {hasAny && (
              <button
                type="button"
                onClick={clearAll}
                className="text-terracotta hover:bg-terracotta-light inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium sm:col-span-2 lg:col-auto short:h-10"
              >
                <X className="size-4" aria-hidden />
                {t("clear")}
              </button>
            )}
          </div>

          {/* Filters apply as you change them; this just reveals the results. */}
          <div className="border-line bg-sand-50 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
            <button
              type="button"
              onClick={closeSheet}
              disabled={pending}
              className="bg-terracotta text-sand-50 hover:bg-terracotta-dark inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-colors disabled:opacity-70"
            >
              {t("showResults", { count: total })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium short:py-2 transition-[background-color,border-color,color,box-shadow,scale] duration-500 ease-(--ease-editorial) active:scale-[0.97] [&_svg]:transition-transform [&_svg]:duration-500",
        active
          ? "border-ink bg-ink text-sand-50 shadow-[0_10px_24px_-14px_rgb(29_26_22/0.7)]"
          : "border-line text-ink-soft hover:border-ink/30 hover:text-ink bg-white hover:[&_svg]:-rotate-6",
      )}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 lg:min-w-32 lg:flex-1 short:gap-1">
      <Label htmlFor={id} className="text-muted text-xs">
        {label}
      </Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="short:h-10"
      >
        {children}
      </Select>
    </div>
  );
}

/** Consecutive options with the same `group` become one optgroup (order preserved). */
function groupOptions<T extends { group?: string }>(options: T[]) {
  const groups: { group?: string; options: T[] }[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (last && last.group === option.group) last.options.push(option);
    else groups.push({ group: option.group, options: [option] });
  }
  return groups;
}
