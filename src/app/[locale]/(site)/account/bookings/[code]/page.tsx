import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  StickyNote,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { paymentMethodLabel } from "@/lib/payment-method";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { PrintButton } from "@/features/account/components/print-button";
import { CancelBookingButton } from "@/features/booking/components/cancel-booking-button";
import { PayButton } from "@/features/payment/components/pay-button";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import { WriteReviewButton } from "@/features/reviews/components/write-review-button";
import { requireUser } from "@/server/auth/guards";
import { accountService } from "@/server/services/account.service";
import { isDomainError } from "@/server/services/errors";
import { paymentService } from "@/server/services/payment.service";
import { reviewService } from "@/server/services/review.service";

/**
 * Print stylesheet for the receipt view. The site chrome (header, footer,
 * account page header and tabs) lives in layouts this page doesn't own, so it
 * is hidden here for print only.
 *
 * React keeps hoisted <style> tags after navigating away, so every rule is
 * scoped to `body:has([data-print-receipt])` and stops applying on other pages.
 */
const SCOPE = "body:has([data-print-receipt])";
const PRINT_CSS = `@media print {
  ${SCOPE} > a[href="#main"], ${SCOPE} header, ${SCOPE} footer, ${SCOPE} main#main > section:first-of-type { display: none !important; }
  ${SCOPE} { background: #fff !important; }
  ${SCOPE} [data-reveal] { opacity: 1 !important; translate: none !important; scale: none !important; clip-path: none !important; }
}`;

/** Owner-scoped lookup; unknown codes and other users' bookings both 404. */
async function loadBooking(userId: string, code: string) {
  try {
    return await accountService.bookingDetail(userId, code);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/bookings/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("account.bookingDetail"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: `/account/bookings/${code}`,
    title: t("metaTitle", { code }),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function BookingDetailPage({
  params,
}: PageProps<"/[locale]/account/bookings/[code]">) {
  // Pages guard themselves; the layout check alone is not enough.
  const user = await requireUser();
  const { code } = await params;
  const booking = await loadBooking(user.id, code);
  const [payments, reviewed, locale, t, tc, methods] = await Promise.all([
    paymentService.latestByBookingIds([booking.id]),
    reviewService.reviewedBookingIds(user.id),
    getLocale(),
    getTranslations("account.bookingDetail"),
    getTranslations("common"),
    getTranslations("payment.methods"),
  ]);

  const { tour } = booking;
  const title = localize(tour.title, locale);
  const payment = payments.get(booking.id);
  const isPaid = payment?.status === "paid";
  const awaitingPayment = booking.status === "pending" && !isPaid;
  const travelDate = formatDate(booking.travelDate, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div data-print-receipt className="flex flex-col gap-8">
      <style href="booking-print" precedence="default">
        {PRINT_CSS}
      </style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/account"
          className="group text-ink-soft hover:text-ink -ml-2 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-medium"
        >
          <ArrowLeft
            className="size-4 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
          {t("back")}
        </Link>
        <PrintButton />
      </div>

      {/* Print-only receipt header. */}
      <div className="border-ink hidden border-b pb-4 print:block">
        <p className="font-display text-2xl font-semibold">
          Etno<span className="font-normal italic">Journey</span>
        </p>
        <p className="mt-1 text-sm">{t("receiptTitle")}</p>
      </div>

      <Reveal>
        <section className="border-line grid overflow-hidden rounded-(--radius-card) border bg-white md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] print:block print:border-0">
          <div className="bg-sand-200 relative aspect-[16/10] md:aspect-auto print:hidden">
            <Image
              src={tour.coverImage}
              alt={title}
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-6 p-6 md:p-8 print:p-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-muted text-xs font-medium tracking-wide uppercase">
                  {tour.destination.name}, {tour.destination.province}
                </p>
                <h2 className="mt-1 text-3xl">{title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {payment && <PaymentStatusBadge status={payment.status} />}
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>

            <div className="border-line bg-sand-50 rounded-xl border border-dashed px-5 py-4">
              <p className="text-muted text-[11px] font-semibold tracking-[0.2em] uppercase">
                {t("code")}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-wider">{booking.code}</p>
              <p className="text-muted mt-2 text-xs">{t("receiptNote")}</p>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail icon={CalendarDays} label={t("travelDate")}>
                {travelDate}
              </Detail>
              <Detail icon={Clock} label={t("duration")}>
                {tc("days", { count: tour.durationDays })}
              </Detail>
              <Detail icon={Users} label={t("participants")}>
                {tc("people", { count: booking.participants })}
              </Detail>
              <Detail icon={MapPin} label={t("meetingPoint")}>
                {tour.meetingPoint}
              </Detail>
            </dl>

            <div className="border-line flex flex-wrap items-center gap-2 border-t pt-5 print:hidden">
              {awaitingPayment && <PayButton bookingId={booking.id} />}
              {awaitingPayment && <CancelBookingButton bookingId={booking.id} />}
              {booking.status === "completed" && (
                <WriteReviewButton
                  bookingId={booking.id}
                  tourTitle={title}
                  alreadyReviewed={reviewed.has(booking.id)}
                />
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tours/${tour.slug}`}>
                  {t("viewTour")}
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-3 print:block print:space-y-6">
        <Reveal delay={0.05}>
          <Card title={t("price")}>
            <dl className="space-y-3 text-sm">
              <Row label={t("unitPrice")}>{formatCurrency(booking.unitPrice, locale)}</Row>
              <Row label={t("participants")}>&times; {booking.participants}</Row>
              <Row label={t("total")} strong className="border-line border-t pt-3">
                {formatCurrency(booking.totalPrice, locale)}
              </Row>
            </dl>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card title={t("payment")}>
            {payment ? (
              <dl className="space-y-3 text-sm">
                <Row label={t("status")}>
                  <PaymentStatusBadge status={payment.status} />
                </Row>
                <Row label={t("method")}>
                  {paymentMethodLabel(payment.method, (code) => methods(code))}
                </Row>
                {payment.paidAt && (
                  <Row label={t("paidAt")}>
                    {formatDate(payment.paidAt, locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Row>
                )}
              </dl>
            ) : (
              <p className="text-muted text-sm">{t("paymentNone")}</p>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.15}>
          <Card title={t("contact")}>
            <dl className="grid gap-4 text-sm">
              <Detail icon={UserRound} label={t("contactName")}>
                {booking.contactName}
              </Detail>
              <Detail icon={Phone} label={t("contactPhone")}>
                {booking.contactPhone}
              </Detail>
              {booking.notes && (
                <Detail icon={StickyNote} label={t("notes")}>
                  {booking.notes}
                </Detail>
              )}
            </dl>
          </Card>
        </Reveal>
      </div>

      {tour.itinerary.length > 0 && (
        <Reveal>
          <Card title={t("itinerary")}>
            <ol className="border-line relative space-y-6 border-l pl-6">
              {tour.itinerary.map((day) => (
                <li key={day.id} className="relative">
                  <span
                    className="border-terracotta absolute top-1 -left-[1.95rem] grid size-3.5 place-items-center rounded-full border-2 bg-white"
                    aria-hidden
                  />
                  <p className="text-terracotta text-xs font-semibold tracking-[0.18em] uppercase">
                    {t("day", { day: day.day })}
                  </p>
                  <h3 className="mt-1 text-xl">{localize(day.title, locale)}</h3>
                  <p className="text-ink-soft mt-2 text-sm leading-relaxed">
                    {localize(day.description, locale)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>
      )}

      <p className="text-muted text-xs">
        {t("bookedOn", { date: formatDate(booking.createdAt, locale) })}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-line h-full rounded-(--radius-card) border bg-white p-6 md:p-7 print:break-inside-avoid print:border-0 print:p-0">
      <h2 className="text-muted mb-5 font-sans text-xs font-semibold tracking-[0.2em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One `<dt>/<dd>` pair. The wrapping div is valid inside `<dl>`; style it via `className`. */
function Row({
  label,
  children,
  strong = false,
  className,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-xl font-semibold" : "font-medium"}>{children}</dd>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
