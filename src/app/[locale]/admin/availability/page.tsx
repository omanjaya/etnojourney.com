import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/guards";
import { addMonths } from "@/server/services/availability.rules";
import { availabilityService } from "@/server/services/availability.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ClosureManager } from "@/features/admin-availability/components/closure-manager";
import { ReopenButton } from "@/features/admin-availability/components/reopen-button";
import { ScopePicker } from "@/features/admin-availability/components/scope-picker";
import { parseAvailabilityQuery } from "@/features/admin-availability/schemas";

export async function generateMetadata() {
  const t = await getTranslations("adminAvailability");
  return { title: t("title") };
}

export default async function AdminAvailabilityPage({
  searchParams,
}: PageProps<"/[locale]/admin/availability">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("availability.manage");
  const query = parseAvailabilityQuery(await searchParams);

  const [tours, t, locale] = await Promise.all([
    availabilityService.listTourOptions(),
    getTranslations("adminAvailability"),
    getLocale(),
  ]);
  // An unknown tour id falls back to "all tours" instead of erroring.
  const tour = tours.find((option) => option.id === query.tourId) ?? null;
  const tourId = tour?.id ?? null;
  const [days, closures] = await Promise.all([
    availabilityService.adminMonth(tourId, query.month),
    availabilityService.upcomingClosures(),
  ]);

  const tourName = tour ? localize(tour.title, locale) : null;
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${query.month}-01T00:00:00Z`));
  const monthHref = (month: string) => ({
    pathname: "/admin/availability",
    query: tourId ? { tour: String(tourId), month } : { month },
  });
  const prev = addMonths(query.month, -1);
  const next = addMonths(query.month, 1);

  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const range = (from: string, to: string) =>
    from === to
      ? formatDate(from, locale, short)
      : t("rangeLabel", {
          from: formatDate(from, locale, short),
          to: formatDate(to, locale, short),
        });

  const navButton =
    "border-line hover:border-sand-300 grid size-10 place-items-center rounded-full border bg-white transition-colors short:size-9";

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="short:mb-4 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ScopePicker
          value={tourId ? String(tourId) : "all"}
          month={query.month}
          label={t("scope.label")}
          options={[
            { value: "all", label: t("scope.all") },
            ...tours.map((option) => ({
              value: String(option.id),
              label: option.isPublished
                ? localize(option.title, locale)
                : t("scope.unpublished", { title: localize(option.title, locale) }),
            })),
          ]}
        />
        <nav aria-label={t("month.nav")} className="flex items-center gap-3">
          {prev >= query.minMonth ? (
            <Link href={monthHref(prev)} aria-label={t("month.prev")} className={navButton}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={cn(navButton, "opacity-30")}>
              <ChevronLeft className="size-4" />
            </span>
          )}
          <h2 className="font-display short:text-lg min-w-40 text-center text-xl capitalize">
            {monthLabel}
          </h2>
          {next <= query.maxMonth ? (
            <Link href={monthHref(next)} aria-label={t("month.next")} className={navButton}>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={cn(navButton, "opacity-30")}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </nav>
      </div>

      <ClosureManager
        key={`${tourId ?? "all"}`}
        days={days}
        today={query.today}
        tourId={tourId}
        tourName={tourName}
      />

      <section aria-labelledby="upcoming-closures" className="short:mt-8 mt-12">
        <h2 id="upcoming-closures" className="font-display text-2xl">
          {t("list.title")}
        </h2>
        <p className="text-muted mt-1 mb-5 text-sm">{t("list.description")}</p>

        {closures.length ? (
          <ul className="border-line divide-line divide-y overflow-hidden rounded-(--radius-card) border bg-white">
            <li
              aria-hidden
              className="bg-sand-50 text-muted hidden grid-cols-[13rem_minmax(0,1fr)_minmax(0,1fr)_10rem_8rem] gap-4 px-5 py-3 text-xs font-medium tracking-wide uppercase md:grid"
            >
              <span>{t("list.columns.dates")}</span>
              <span>{t("list.columns.tour")}</span>
              <span>{t("list.columns.reason")}</span>
              <span>{t("list.columns.createdBy")}</span>
              <span>{t("list.columns.actions")}</span>
            </li>
            {closures.map((group) => {
              const head = group.rows[0];
              const tourLabel = head.tourTitle
                ? localize(head.tourTitle, locale)
                : t("list.allTours");
              const dates = range(group.from, group.to);
              return (
                <li
                  key={head.id}
                  className="flex flex-col gap-2 px-4 py-4 text-sm md:grid md:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1fr)_10rem_8rem] md:items-center md:gap-4 md:px-5"
                >
                  <div>
                    <p className="font-medium">{dates}</p>
                    <p className="text-muted text-xs">
                      {t("list.days", { count: group.rows.length })}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {head.tourId === null ? (
                      <Badge tone="indigo">{tourLabel}</Badge>
                    ) : (
                      <span className="line-clamp-2">{tourLabel}</span>
                    )}
                  </div>
                  <p className={cn("min-w-0 break-words", !head.reason && "text-muted")}>
                    {head.reason ?? t("list.noReason")}
                  </p>
                  <p className="text-ink-soft text-xs md:text-sm">
                    <span className="text-muted md:hidden">{t("list.columns.createdBy")}: </span>
                    {head.createdByName ?? t("list.unknownUser")}
                  </p>
                  <ReopenButton
                    ids={group.rows.map((row) => row.id)}
                    text={t("list.delete")}
                    label={t("list.deleteLabel", { dates, tour: tourLabel })}
                    confirmText={t("list.confirm", { dates, tour: tourLabel })}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title={t("list.empty.title")}
            description={t("list.empty.description")}
          />
        )}
      </section>
    </>
  );
}
