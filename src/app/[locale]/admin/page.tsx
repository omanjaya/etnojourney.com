import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  CircleX,
  Hourglass,
  MapIcon,
  Wallet,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { dashboardService } from "@/server/services/dashboard.service";
import { CountUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BookingsTable } from "@/features/admin/components/bookings-table";
import { StatCard } from "@/features/admin/components/stat-card";

export default async function AdminOverviewPage() {
  const [user, overview, t, tb, locale] = await Promise.all([
    requireAdmin(),
    dashboardService.overview(),
    getTranslations("admin.overview"),
    getTranslations("admin.bookings"),
    getLocale(),
  ]);
  const { counts, revenue, publishedTours, recent } = overview;
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

      <div className="admin-stagger grid grid-cols-2 gap-3 xl:grid-cols-3">
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
