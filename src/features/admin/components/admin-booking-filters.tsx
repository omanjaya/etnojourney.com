"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminSearchBox } from "./admin-search-box";

type Query = Record<string, string | undefined>;

const fieldClass =
  "border-line focus:border-terracotta focus:ring-terracotta/10 h-11 rounded-full border bg-white px-4 text-sm transition-colors focus:ring-4 focus:outline-none";

/**
 * Search, travel-date range and sort for the admin bookings list. Every change
 * rewrites the URL (shareable, back-button friendly) and resets to page 1.
 */
export function AdminBookingFilters({ query, exportHref }: { query: Query; exportHref: string }) {
  const t = useTranslations("admin.bookings.filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (patch: Query) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries({ ...query, ...patch })) {
      if (key !== "page" && value) next[key] = value;
    }
    startTransition(() =>
      router.replace({ pathname: "/admin/bookings", query: next }, { scroll: false }),
    );
  };

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between",
        pending && "opacity-70 transition-opacity",
      )}
    >
      <AdminSearchBox
        pathname="/admin/bookings"
        query={query}
        label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        clearLabel={t("clear")}
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-ink-soft flex flex-col gap-1 text-xs font-medium">
          {t("from")}
          <input
            type="date"
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
            value={query.to ?? ""}
            min={query.from}
            onChange={(event) => apply({ to: event.target.value || undefined })}
            className={fieldClass}
          />
        </label>
        <label className="text-ink-soft flex flex-col gap-1 text-xs font-medium">
          {t("sort")}
          <select
            value={query.sort ?? "created"}
            onChange={(event) =>
              apply({ sort: event.target.value === "created" ? undefined : event.target.value })
            }
            className={cn(fieldClass, "pr-8")}
          >
            <option value="created">{t("sortCreated")}</option>
            <option value="travel">{t("sortTravel")}</option>
          </select>
        </label>
        {(query.from || query.to || query.q || query.sort) && (
          <button
            type="button"
            onClick={() =>
              startTransition(() =>
                router.replace(
                  {
                    pathname: "/admin/bookings",
                    query: query.status ? { status: query.status } : {},
                  },
                  { scroll: false },
                ),
              )
            }
            className="text-muted hover:text-ink h-11 px-2 text-sm underline-offset-4 hover:underline"
          >
            {t("reset")}
          </button>
        )}
        {/* A plain link: the route handler streams a file download. */}
        <a
          href={exportHref}
          className={buttonVariants({ variant: "outline", size: "md" })}
          download
        >
          <Download aria-hidden />
          {t("export")}
        </a>
      </div>
    </div>
  );
}
