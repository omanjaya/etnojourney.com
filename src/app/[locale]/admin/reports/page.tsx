import { CalendarCheck, Download, HandCoins, Undo2, Users, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { requireAdmin } from "@/server/auth/guards";
import { bookingStatus } from "@/server/db/schema";
import { percentOf } from "@/server/services/report.rules";
import { reportService } from "@/server/services/report.service";
import { buttonVariants } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatCard } from "@/features/admin/components/stat-card";
import { BarChart } from "@/features/admin-insights/components/bar-chart";
import { ReportPeriodPicker } from "@/features/admin-insights/components/report-period-picker";
import { parseReportQuery, reportQueryOf } from "@/features/admin-insights/schemas";
import { TableScroll } from "@/components/ui/table-scroll";

export async function generateMetadata() {
  const t = await getTranslations("adminInsights.reports");
  return { title: t("title") };
}

/** `YYYY-MM` as "Mar 2026" in the UI locale. */
function monthLabel(month: string, locale: Locale) {
  return formatDate(`${month}-01`, locale, { month: "short", year: "numeric" });
}

export default async function AdminReportsPage({
  searchParams,
}: PageProps<"/[locale]/admin/reports">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("reports.view");
  const period = parseReportQuery(await searchParams);

  const [report, t, ts, locale] = await Promise.all([
    reportService.overview(period),
    getTranslations("adminInsights.reports"),
    getTranslations("common.bookingStatus"),
    getLocale() as Promise<Locale>,
  ]);
  const { totals, byStatus, months, tours } = report;
  const money = (value: number) => formatCurrency(value, locale);
  const number = (value: number) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(value);
  const exportHref = `/api/admin/reports/export?${new URLSearchParams(reportQueryOf(period))}`;
  const range = `${formatDate(period.from, locale)} - ${formatDate(period.to, locale)}`;

  const th = "px-4 py-3 font-medium";
  const td = "px-4 py-3 tabular-nums";

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <ReportPeriodPicker period={period} />

      <p className="text-muted mb-4 text-sm" aria-live="polite">
        {t("showing", { range })}
      </p>

      <section
        aria-label={t("totalsLabel")}
        className="admin-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:*:col-span-2 lg:[&>*:nth-child(n+4)]:col-span-3"
      >
        <StatCard
          icon={Wallet}
          accent="indigo"
          label={t("totals.net")}
          value={<span data-testid="report-net">{money(totals.net)}</span>}
          hint={t("totals.netHint")}
        />
        <StatCard
          icon={HandCoins}
          accent="leaf"
          label={t("totals.gross")}
          value={money(totals.gross)}
        />
        <StatCard
          icon={Undo2}
          accent="danger"
          label={t("totals.refunds")}
          value={money(totals.refunds)}
          hint={t("totals.refundCount", { count: totals.refundCount })}
        />
        <StatCard
          icon={CalendarCheck}
          accent="gold"
          label={t("totals.bookings")}
          value={<span data-testid="report-bookings">{number(totals.bookings)}</span>}
          hint={t("totals.participants", { count: totals.participants })}
        />
        <StatCard
          icon={Users}
          accent="terracotta"
          label={t("totals.groupSize")}
          value={totals.averageGroupSize.toLocaleString(locale === "id" ? "id-ID" : "en-US")}
          hint={t("totals.groupSizeHint")}
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="report-status"
          className="border-line rounded-(--radius-card) border bg-white p-5"
        >
          <h2 id="report-status" className="text-2xl">
            {t("status.title")}
          </h2>
          <p className="text-muted mt-1 text-sm">{t("status.description")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bookingStatus.enumValues.map((status) => (
              <div key={status} className="bg-sand-50 rounded-xl p-3">
                <dt className="text-ink-soft text-xs">{ts(status)}</dt>
                <dd className="font-display mt-1 text-2xl tabular-nums">
                  {number(byStatus[status])}
                </dd>
                <dd className="text-muted text-xs">
                  {t("status.share", { percent: percentOf(byStatus[status], totals.bookings) })}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="report-top"
          className="border-line rounded-(--radius-card) border bg-white p-5"
        >
          <h2 id="report-top" className="mb-4 text-2xl">
            {t("top.title")}
          </h2>
          {tours.length ? (
            <BarChart
              title={t("top.caption")}
              tone="indigo"
              bars={tours.slice(0, 5).map((row) => ({
                key: String(row.tourId),
                label: localize(row.title.title, locale),
                value: row.net,
                display: money(row.net),
              }))}
            />
          ) : (
            <p className="text-muted text-sm">{t("empty")}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="report-months" className="mt-10">
        <h2 id="report-months" className="mb-4 text-2xl">
          {t("months.title")}
        </h2>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="border-line rounded-(--radius-card) border bg-white p-5">
            <BarChart
              title={t("months.caption")}
              bars={months.map((row) => ({
                key: row.month,
                label: monthLabel(row.month, locale),
                value: row.net,
                display: money(row.net),
              }))}
            />
          </div>
          <TableScroll label={t("months.tableLabel")}>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">{t("months.title")}</caption>
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className={th}>
                    {t("columns.month")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.bookings")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.gross")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.refunds")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.net")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {months.map((row) => (
                  <tr key={row.month}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      {monthLabel(row.month, locale)}
                    </th>
                    <td className={`${td} text-right`}>{number(row.bookings)}</td>
                    <td className={`${td} text-right`}>{money(row.gross)}</td>
                    <td className={`${td} text-right`}>{money(row.refunds)}</td>
                    <td className={`${td} text-right font-medium`}>{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      </section>

      <section aria-labelledby="report-tours" className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="report-tours" className="text-2xl">
            {t("tours.title")}
          </h2>
          <a
            href={exportHref}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download aria-hidden />
            {t("tours.export")}
          </a>
        </div>
        {tours.length ? (
          <TableScroll label={t("tours.tableLabel")}>
            <table className="w-full min-w-[48rem] text-left text-sm">
              <caption className="sr-only">{t("tours.title")}</caption>
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className={th}>
                    {t("columns.tour")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.bookings")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.participants")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.gross")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.refunds")}
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    {t("columns.net")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line [&>tr:hover]:bg-sand-50/70 divide-y">
                {tours.map((row) => (
                  <tr key={row.tourId}>
                    <th scope="row" className="max-w-64 px-4 py-3 font-medium">
                      <Link
                        href={`/tours/${row.title.slug}`}
                        className="hover:text-terracotta line-clamp-2"
                      >
                        {localize(row.title.title, locale)}
                      </Link>
                    </th>
                    <td className={`${td} text-right`}>{number(row.bookings)}</td>
                    <td className={`${td} text-right`}>{number(row.participants)}</td>
                    <td className={`${td} text-right`}>{money(row.gross)}</td>
                    <td className={`${td} text-right`}>{money(row.refunds)}</td>
                    <td className={`${td} text-right font-medium`}>{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-muted border-line rounded-(--radius-card) border bg-white p-5 text-sm">
            {t("empty")}
          </p>
        )}
      </section>
    </>
  );
}
