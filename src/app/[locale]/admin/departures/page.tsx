import type { Metadata } from "next";
import {
  CalendarRange,
  MailCheck,
  MapPin,
  SearchX,
  StickyNote,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CapacityBar } from "@/features/admin-departures/components/capacity-bar";
import { DepartureFilters } from "@/features/admin-departures/components/departure-filters";
import { parseDepartureQuery } from "@/features/admin-departures/schemas";
import { requireAdmin } from "@/server/auth/guards";
import { daysBetween, departurePath } from "@/server/services/departure.rules";
import { departureService } from "@/server/services/departure.service";
import { businessToday } from "@/server/services/self-service.rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminDepartures");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminDeparturesPage({
  searchParams,
}: PageProps<"/[locale]/admin/departures">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("departures.manage");
  const today = businessToday();
  const query = parseDepartureQuery(await searchParams, today);

  const [agenda, tours, t, locale] = await Promise.all([
    departureService.agenda(query),
    departureService.listTourOptions(),
    getTranslations("adminDepartures"),
    getLocale(),
  ]);

  // Only explicitly chosen values go back into the URL-driven filter form.
  const current: Record<string, string | undefined> = {
    from: query.custom ? query.from : undefined,
    to: query.custom ? query.to : undefined,
    tour: query.tourId ? String(query.tourId) : undefined,
    noGuide: query.withoutGuide ? "1" : undefined,
  };
  const filtered = Boolean(query.custom || query.tourId || query.withoutGuide);
  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  const relative = (date: string) => {
    const days = daysBetween(today, date);
    if (days === 0) return t("agenda.today");
    if (days === 1) return t("agenda.tomorrow");
    return days > 0 ? t("agenda.inDays", { count: days }) : t("agenda.daysAgo", { count: -days });
  };

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <DepartureFilters
        query={current}
        tours={tours.map((tour) => ({
          value: String(tour.id),
          label: tour.isPublished
            ? localize(tour.title, locale)
            : t("filters.unpublished", { title: localize(tour.title, locale) }),
        }))}
      />

      <p className="text-muted short:mb-4 mb-6 text-sm" aria-live="polite">
        {t("agenda.summary", {
          total: agenda.total,
          withoutGuide: agenda.withoutGuide,
          from: formatDate(query.from, locale, short),
          to: formatDate(query.to, locale, short),
        })}
      </p>

      {agenda.groups.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t("agenda.noMatch.title")}
            description={t("agenda.noMatch.description")}
          />
        ) : (
          <EmptyState
            icon={CalendarRange}
            title={t("agenda.empty.title")}
            description={t("agenda.empty.description")}
          />
        )
      ) : (
        <div className="short:gap-6 flex flex-col gap-8">
          {agenda.groups.map((group) => (
            <section key={group.date} aria-labelledby={`day-${group.date}`}>
              <h2
                id={`day-${group.date}`}
                className="short:mb-2 mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span className="font-display short:text-lg text-xl capitalize">
                  {formatDate(group.date, locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-muted font-sans text-xs font-medium tracking-wide uppercase">
                  {relative(group.date)}
                </span>
              </h2>
              <ul className="border-line divide-line divide-y overflow-hidden rounded-(--radius-card) border bg-white">
                {group.departures.map((departure) => {
                  const title = localize(departure.tourTitle, locale);
                  const { load } = departure;
                  return (
                    <li
                      key={departure.tourId}
                      data-testid="departure-row"
                      className="hover:bg-sand-50/60 short:py-3 grid gap-3 px-5 py-4 transition-colors md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_6rem_minmax(0,1.1fr)] md:items-center md:gap-5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={departurePath(departure.tourId, departure.date)}
                          className="hover:text-terracotta line-clamp-2 leading-snug font-medium underline-offset-4 hover:underline"
                        >
                          {title}
                        </Link>
                        <p className="text-muted mt-0.5 flex items-center gap-1 text-xs">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          {departure.destinationName}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="text-ink-soft">
                            {t("agenda.participants", {
                              confirmed: load.confirmed,
                              pending: load.pending,
                            })}
                          </span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              load.overbooked && "text-danger",
                            )}
                          >
                            {t("agenda.seats", {
                              booked: load.booked,
                              capacity: departure.capacity,
                            })}
                          </span>
                        </p>
                        <CapacityBar
                          className="mt-1.5"
                          load={load}
                          label={t("capacity.label", {
                            confirmed: load.confirmed,
                            pending: load.pending,
                            capacity: departure.capacity,
                          })}
                        />
                      </div>

                      <p className="text-ink-soft text-sm tabular-nums">
                        {t("agenda.bookings", { count: departure.bookings })}
                      </p>

                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {departure.needsGuide ? (
                          <Badge tone="danger">
                            <TriangleAlert aria-hidden />
                            {departure.guideName
                              ? t("agenda.guideInactive", { name: departure.guideName })
                              : t("agenda.noGuide")}
                          </Badge>
                        ) : (
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                            <UserCheck className="text-leaf size-4 shrink-0" aria-hidden />
                            <span className="truncate">{departure.guideName}</span>
                          </span>
                        )}
                        {departure.hasNote && (
                          <span className="text-muted inline-flex" title={t("agenda.hasNote")}>
                            <StickyNote className="size-4" aria-hidden />
                            <span className="sr-only">{t("agenda.hasNote")}</span>
                          </span>
                        )}
                        {departure.notifiedAt && (
                          <span className="text-leaf inline-flex" title={t("agenda.notified")}>
                            <MailCheck className="size-4" aria-hidden />
                            <span className="sr-only">{t("agenda.notified")}</span>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
