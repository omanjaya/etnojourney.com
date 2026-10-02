import { ArrowLeft, CalendarDays, Clock, MapPin, Phone, StickyNote, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { requirePartner } from "@/server/auth/guards";
import { isIsoDate } from "@/server/services/guide.rules";
import { partnerService } from "@/server/services/partner.service";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-line rounded-(--radius-card) border bg-white p-4">
      <dt className="text-muted inline-flex items-center gap-2 text-xs">
        <Icon className="size-4" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium whitespace-pre-line">{children}</dd>
    </div>
  );
}

/**
 * Partner-safe manifest: only departures assigned to the signed-in partner's
 * guide resolve (anything else is a 404), and only booking code, contact name
 * and phone, party size and traveller notes are shown.
 */
export default async function PartnerDeparturePage({
  params,
}: PageProps<"/[locale]/partner/departures/[tourId]/[date]">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  const user = await requirePartner();
  const { tourId: rawTourId, date } = await params;
  if (!/^\d{1,9}$/.test(rawTourId) || !isIsoDate(date)) notFound();
  const tourId = Number(rawTourId);

  const [result, locale, t] = await Promise.all([
    partnerService.departure(user.id, tourId, date),
    getLocale(),
    getTranslations("partner.manifest"),
  ]);
  if (!result) notFound();
  const { departure, travellers } = result;
  const title = localize(departure.tourTitle, locale);

  return (
    <>
      <PageHeader
        compact
        eyebrow={formatDate(date, locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        title={title}
      >
        <Link
          href="/partner"
          className="text-ink-soft hover:text-ink mt-4 inline-flex min-h-10 items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
      </PageHeader>

      <Container className="short:py-8 flex flex-col gap-10 py-10 md:py-14">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={CalendarDays} label={t("date")}>
            {formatDate(date, locale)}
          </Fact>
          <Fact icon={MapPin} label={t("meetingPoint")}>
            {departure.meetingPoint}
          </Fact>
          <Fact icon={Clock} label={t("duration")}>
            {t("days", { count: departure.durationDays })}
          </Fact>
          <Fact icon={Users} label={t("travellers")}>
            {t("travellersValue", {
              participants: departure.participantCount,
              bookings: departure.bookingCount,
            })}
          </Fact>
        </dl>

        {departure.note && (
          <section className="border-gold/40 bg-gold-light/40 rounded-(--radius-card) border p-5">
            <h2 className="inline-flex items-center gap-2 text-lg">
              <StickyNote className="text-terracotta size-4" aria-hidden />
              {t("noteTitle")}
            </h2>
            <p className="text-ink-soft mt-2 text-sm whitespace-pre-line">{departure.note}</p>
          </section>
        )}

        <section aria-labelledby="manifest-title">
          <h2 id="manifest-title" className="mb-4 text-2xl">
            {t("title")}
          </h2>
          {travellers.length === 0 ? (
            <EmptyState
              icon={Users}
              headingLevel="h3"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <div className="border-line overflow-x-auto rounded-(--radius-card) border bg-white">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("columns.code")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("columns.contact")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      {t("columns.participants")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("columns.notes")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {travellers.map((row) => (
                    <tr key={row.code} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wide">
                        {row.code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.contactName}</p>
                        <a
                          href={`tel:${row.contactPhone.replace(/[^\d+]/g, "")}`}
                          className="text-ink-soft hover:text-terracotta inline-flex min-h-8 items-center gap-1.5 underline-offset-4 hover:underline"
                        >
                          <Phone className="size-3.5" aria-hidden />
                          {row.contactPhone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.participants}</td>
                      <td className="text-ink-soft max-w-80 px-4 py-3 whitespace-pre-line">
                        {row.notes || <span className="text-muted">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
