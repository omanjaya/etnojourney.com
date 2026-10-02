"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | undefined>;

const fieldClass =
  "border-line focus:border-terracotta focus:ring-terracotta/10 short:h-10 h-11 rounded-full border bg-white px-4 text-sm transition-colors focus:ring-4 focus:outline-none";

/**
 * Date range, tour and "without guide" filters for the departures agenda.
 * Every change rewrites the URL so a filtered agenda can be shared.
 */
export function DepartureFilters({
  query,
  tours,
}: {
  query: Query;
  tours: { value: string; label: string }[];
}) {
  const t = useTranslations("adminDepartures.filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = (next: Query) => {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(next)) if (value) clean[key] = value;
    startTransition(() =>
      router.replace({ pathname: "/admin/departures", query: clean }, { scroll: false }),
    );
  };
  const apply = (patch: Query) => navigate({ ...query, ...patch });
  const filtered = Boolean(query.from || query.to || query.tour || query.noGuide);

  return (
    <div
      role="search"
      aria-label={t("label")}
      aria-busy={pending || undefined}
      className={cn(
        "short:mb-4 mb-6 flex flex-wrap items-end gap-3",
        pending && "opacity-70 transition-opacity",
      )}
    >
      <label className="text-ink-soft flex flex-col gap-1 text-xs font-medium">
        {t("from")}
        <input
          type="date"
          name="from"
          value={query.from ?? ""}
          max={query.to}
          onChange={(event) => apply({ from: event.target.value || undefined })}
          className={fieldClass}
        />
      </label>
      <label className="text-ink-soft flex flex-col gap-1 text-xs font-medium">
        {t("to")}
        <input
          type="date"
          name="to"
          value={query.to ?? ""}
          min={query.from}
          onChange={(event) => apply({ to: event.target.value || undefined })}
          className={fieldClass}
        />
      </label>
      <label className="text-ink-soft flex min-w-0 flex-col gap-1 text-xs font-medium">
        {t("tour")}
        <select
          name="tour"
          value={query.tour ?? ""}
          onChange={(event) => apply({ tour: event.target.value || undefined })}
          className={cn(fieldClass, "max-w-full pr-8 sm:w-72")}
        >
          <option value="">{t("allTours")}</option>
          {tours.map((tour) => (
            <option key={tour.value} value={tour.value}>
              {tour.label}
            </option>
          ))}
        </select>
      </label>
      <label className="border-line has-checked:border-terracotta/50 has-checked:bg-terracotta-light/50 short:h-10 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium">
        <input
          type="checkbox"
          name="noGuide"
          checked={query.noGuide === "1"}
          onChange={(event) => apply({ noGuide: event.target.checked ? "1" : undefined })}
          className="accent-terracotta size-4"
        />
        {t("withoutGuide")}
      </label>
      {filtered && (
        <button
          type="button"
          onClick={() => navigate({})}
          className="text-muted hover:text-ink short:h-10 h-11 px-2 text-sm underline-offset-4 hover:underline"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}
