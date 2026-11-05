import {
  ArrowRight,
  CalendarCheck,
  CalendarRange,
  CircleCheck,
  CircleX,
  HandCoins,
  Hourglass,
  MapIcon,
  Wallet,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { dashboardService } from "@/server/services/dashboard.service";
import { needsGuideWindow } from "@/server/services/departure.rules";
import { departureService } from "@/server/services/departure.service";
import { businessToday } from "@/server/services/self-service.rules";
import { CountUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BookingsTable } from "@/features/admin/components/bookings-table";
import { StatCard } from "@/features/admin/components/stat-card";
import { WorkQueueCard } from "@/features/admin-insights/components/work-queue-card";

export default async function AdminOverviewPage() {
  // The guard runs first: what the dashboard loads depends on the role.
  const user = await requireAdmin();
  const canSeeRevenue = can(user.role, "reports.view");
  const canRefund = can(user.role, "payments.refund");
  const canManageDepartures = can(user.role, "departures.manage");
  const [overview, t, tb, tq, td, withoutGuide, locale] = await Promise.all([
    dashboardService.overview({ withRefunds: canRefund, withRevenue: canSeeRevenue }),
    getTranslations("admin.overview"),
    getTranslations("admin.bookings"),
    getTranslations("adminInsights.dashboard"),
    getTranslations("adminDepartures.dashboard"),
    canManageDepartures ? departureService.countNeedingGuideSoon() : Promise.resolve(null),
    getLocale(),
  ]);
  const guideWindow = needsGuideWindow(businessToday());
  const { counts, revenue, publishedTours, recent, refundsNeeded } = overview;
  const pending = counts.pending ?? 0;
  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const n = (value?: number) => <CountUp value={value ?? 0} locale={intlLocale} duration={900} />;
  // Currency symbol (e.g. "Rp" / "IDR") kept static while the amount counts up.
  const currencyPrefix = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .formatToParts(0)
    .filter((part) => part.type === "currency" || part.type === "literal")
    .map((part) => part.value)
    .join("");

  return (
    <>
      <AdminPageHeader
        eyebrow={t("eyebrow")}
        title={t("title", { name: user.name.split(" ")[0] })}
        description={t("description")}
      />

      <section
        aria-label={tq("queuesLabel")}
        className="short:mb-4 mb-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
      >
        <WorkQueueCard
          icon={Hourglass}
          href="/admin/bookings?status=pending"
          label={tq("pending.label")}
          action={tq("pending.action")}
          count={pending}
          countLabel={tq("pending.count", { count: pending })}
          urgent={pending > 0}
        />
        {refundsNeeded !== null && (
          <WorkQueueCard
            icon={HandCoins}
            href="/admin/payments"
            label={tq("refunds.label")}
            action={tq("refunds.action")}
            count={refundsNeeded}
            countLabel={tq("refunds.count", { count: refundsNeeded })}
            urgent={refundsNeeded > 0}
          />
        )}
        {withoutGuide !== null && (
          <WorkQueueCard
            icon={CalendarRange}
            href={`/admin/departures?from=${guideWindow.from}&to=${guideWindow.to}&noGuide=1`}
            label={td("label")}
            action={td("action")}
            count={withoutGuide}
            countLabel={td("count", { count: withoutGuide })}
            urgent={withoutGuide > 0}
          />
        )}
      </section>

      <div className="admin-stagger grid grid-cols-2 gap-3 xl:grid-cols-3">
        {revenue !== null && (
          <StatCard
            icon={Wallet}
            accent="indigo"
            label={t("stats.revenue")}
            value={
              <>
                {currencyPrefix}
                <CountUp value={revenue} locale={intlLocale} duration={1100} />
              </>
            }
            hint={t("stats.revenueHint")}
          />
        )}
        <StatCard
          icon={Hourglass}
          accent="gold"
          label={t("stats.pending")}
          value={n(counts.pending)}
        />
        <StatCard
          icon={CalendarCheck}
          accent="leaf"
          label={t("stats.confirmed")}
          value={n(counts.confirmed)}
        />
        <StatCard
          icon={CircleCheck}
          accent="sand"
          label={t("stats.completed")}
          value={n(counts.completed)}
        />
        <StatCard
          icon={CircleX}
          accent="danger"
          label={t("stats.cancelled")}
          value={n(counts.cancelled)}
        />
        <StatCard
          icon={MapIcon}
          accent="terracotta"
          label={t("stats.publishedTours")}
          value={n(publishedTours)}
        />
      </div>

      <section className="mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl">{t("recent")}</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/bookings">
              {t("viewAll")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        {recent.length ? (
          <BookingsTable rows={recent} />
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title={tb("empty.title")}
            description={tb("empty.description")}
          />
        )}
      </section>
    </>
  );
}
