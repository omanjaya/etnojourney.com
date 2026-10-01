"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { categoryIcons, tourCategories } from "@/components/shared/category-icon";
import { DURATION_STEPS, PRICE_STEPS, SORT_OPTIONS, type TourSearch } from "../search-options";

type Props = {
  search: TourSearch;
  destinations: { slug: string; name: string }[];
};

export function TourFilters({ search, destinations }: Props) {
  const t = useTranslations("tours.filters");
  const tc = useTranslations("common.categories");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search.q ?? "");
  const [open, setOpen] = useState(false);
  const firstRender = useRef(true);

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

  const activeCount = [search.destination, search.maxPrice, search.maxDays].filter(Boolean).length;
  const hasAny = Boolean(search.q || search.category || activeCount);

  return (
    <div
      className={cn("space-y-6 transition-opacity", pending && "opacity-70")}
      aria-busy={pending}
    >
      {/* Category pills */}
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
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
            className="pl-11"
            maxLength={80}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="tour-filter-panel"
          className="border-line inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-white px-5 text-sm font-medium lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("toggle")}
          {activeCount > 0 && (
            <span className="bg-terracotta grid size-5 place-items-center rounded-full text-[11px] text-white">
              {activeCount}
            </span>
          )}
        </button>

        <div
          id="tour-filter-panel"
          className={cn(
            "grid gap-3 sm:grid-cols-2 lg:flex lg:items-end",
            !open && "hidden lg:flex",
          )}
        >
          <FilterSelect
            id="filter-destination"
            label={t("destination")}
            value={search.destination ?? ""}
            onChange={(v) => apply({ destination: v || undefined })}
          >
            <option value="">{t("allDestinations")}</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
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
            id="filter-days"
            label={t("maxDays")}
            value={search.maxDays?.toString() ?? ""}
            onChange={(v) => apply({ maxDays: v ? Number(v) : undefined })}
          >
            <option value="">{t("anyDuration")}</option>
            {DURATION_STEPS.map((d) => (
              <option key={d} value={d}>
                {t("upToDays", { count: d })}
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
              onClick={() => {
                setQuery("");
                startTransition(() => router.replace("/tours", { scroll: false }));
              }}
              className="text-terracotta hover:bg-terracotta-light inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium"
            >
              <X className="size-4" aria-hidden />
              {t("clear")}
            </button>
          )}
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
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,scale] duration-500 ease-(--ease-editorial) active:scale-[0.97] [&_svg]:transition-transform [&_svg]:duration-500",
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
    <div className="flex flex-col gap-1.5 lg:min-w-40">
      <Label htmlFor={id} className="text-muted text-xs">
        {label}
      </Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </div>
  );
}
