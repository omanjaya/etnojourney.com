import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Backpack,
  CalendarDays,
  CalendarPlus,
  FileDown,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleMinus,
  HandHeart,
  Navigation,
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
import type { LocalizedText } from "@/lib/i18n-text";
import type { Locale } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
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
import { siteContact } from "@/config/site";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import { WriteReviewButton } from "@/features/reviews/components/write-review-button";
import { CancelPaidBookingDialog } from "@/features/self-service/components/cancel-paid-booking-dialog";
import { RescheduleDialog } from "@/features/self-service/components/reschedule-dialog";
import { cancellationPolicy } from "@/config/cancellation";
import { requireUser } from "@/server/auth/guards";
import { accountService } from "@/server/services/account.service";
import { isDomainError } from "@/server/services/errors";
import { paymentService } from "@/server/services/payment.service";
import { reviewService } from "@/server/services/review.service";
import {
  businessToday,
  cancelOption,
  rescheduleBlocker,
  tierRanges,
} from "@/server/services/self-service.rules";

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
  const upcoming = booking.status === "pending" || booking.status === "confirmed";
  // E-ticket PDF (route handler, so a plain link rather than <Link>).
  const hasTicket = booking.status === "confirmed" || booking.status === "completed";
  const ticketHref = `/api/bookings/${encodeURIComponent(booking.code)}/ticket?locale=${locale}`;
  const tTrip = await getTranslations("trip.ticket");
  const calendarHref = getPathname({
    href: `/account/bookings/${booking.code}/calendar.ics`,
    locale,
  });
  const steps = nextSteps(booking.status, isPaid);
  // Self-service: what the traveller may do today (Asia/Jakarta); the server re-checks on submit.
  const today = businessToday();
  const cancel = cancelOption(booking, isPaid ? payment.amount : null, today);
  const rescheduleBlock = upcoming ? rescheduleBlocker(booking, today) : null;
  const tsService = await getTranslations("selfService");
  const contactEmail = siteContact().email;
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
              {awaitingPayment && <PayButton bookingId={booking.id} contactEmail={contactEmail} />}
              {upcoming && (
                <Button asChild variant="outline" size="sm">
                  <a href={calendarHref} download>
                    <CalendarPlus aria-hidden />
                    {t("addToCalendar")}
                  </a>
                </Button>
              )}
              {hasTicket && (
                <Button asChild variant="outline" size="sm">
                  <a href={ticketHref} download>
                    <FileDown aria-hidden />
                    {tTrip("download")}
                  </a>
                </Button>
              )}
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
              {upcoming && !rescheduleBlock && (
                <RescheduleDialog
                  bookingId={booking.id}
                  code={booking.code}
                  tourId={tour.id}
                  currentDate={booking.travelDate}
                  participants={booking.participants}
                  participantsLabel={tc("people", { count: booking.participants })}
                  maxReschedules={cancellationPolicy.maxReschedules}
                  closesDaysBefore={cancellationPolicy.rescheduleMinDaysBefore}
                />
              )}
              {awaitingPayment && (
                <span className="ml-auto">
                  <CancelBookingButton bookingId={booking.id} />
                </span>
              )}
              {!awaitingPayment && cancel?.kind === "paid" && payment && (
                <span className="ml-auto">
                  <CancelPaidBookingDialog
                    bookingId={booking.id}
                    code={booking.code}
                    paidAmount={payment.amount}
                    quote={cancel.quote}
                    ranges={tierRanges()}
                  />
                </span>
              )}
            </div>
            {(rescheduleBlock === "limit" || rescheduleBlock === "tooLate") && (
              <p data-testid="reschedule-blocked" className="text-muted -mt-3 text-xs print:hidden">
                {rescheduleBlock === "limit"
                  ? tsService("panel.rescheduleBlocked.limit", {
                      max: cancellationPolicy.maxReschedules,
                    })
                  : tsService("panel.rescheduleBlocked.tooLate", {
                      days: cancellationPolicy.rescheduleMinDaysBefore,
                    })}{" "}
                <Link
                  href="/cancellation-policy"
                  className="text-terracotta font-medium underline-offset-4 hover:underline"
                >
                  {tsService("panel.policyLink")}
                </Link>
              </p>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <Card title={t("nextStepsTitle")}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon =
                step.state === "done"
                  ? CircleCheck
                  : step.state === "current"
                    ? CircleDot
                    : CircleDashed;
              return (
                <li
                  key={step.key}
                  className={cn(
                    "flex gap-3 rounded-xl p-4 text-sm",
                    step.state === "current" ? "bg-terracotta-light" : "bg-sand-50",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      step.state === "done" && "text-leaf",
                      step.state === "current" && "text-terracotta",
                      step.state === "upcoming" && "text-muted",
                    )}
                    aria-hidden
                  />
                  <div>
                    {step.state !== "upcoming" && (
                      <p className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                        {step.state === "done" ? t("stepDone") : t("stepCurrent")}
                      </p>
                    )}
                    <p className={step.state === "upcoming" ? "text-ink-soft" : "font-medium"}>
                      {t(`steps.${step.key}`)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </Reveal>

      <BeforeYouGo
        locale={locale}
        gettingThere={tour.destination.gettingThere}
        whatToBring={tour.whatToBring}
        etiquette={tour.etiquette}
        notIncluded={tour.notIncluded}
        labels={{
          title: t("prepTitle"),
          bring: t("prepBring"),
          etiquette: t("prepEtiquette"),
          notIncluded: t("prepNotIncluded"),
          gettingThere: t("prepGettingThere", { place: tour.destination.name }),
        }}
      />

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

type StepKey = "pay" | "paid" | "email" | "host" | "prepare" | "review" | "cancelled";
type Step = { key: StepKey; state: "done" | "current" | "upcoming" };

/** The journey after booking, adapted to where this booking is now. */
function nextSteps(status: string, isPaid: boolean): Step[] {
  if (status === "cancelled") return [{ key: "cancelled", state: "current" }];
  if (status === "completed") {
    return [
      { key: "paid", state: "done" },
      { key: "prepare", state: "done" },
      { key: "review", state: "current" },
    ];
  }
  if (!isPaid && status === "pending") {
    return [
      { key: "pay", state: "current" },
      { key: "email", state: "upcoming" },
      { key: "host", state: "upcoming" },
      { key: "prepare", state: "upcoming" },
    ];
  }
  return [
    { key: "paid", state: "done" },
    { key: "email", state: "done" },
    { key: "host", state: "current" },
    { key: "prepare", state: "upcoming" },
  ];
}

/** Practical info for the trip; hidden entirely when the tour has none yet. */
function BeforeYouGo({
  locale,
  gettingThere,
  whatToBring,
  etiquette,
  notIncluded,
  labels,
}: {
  locale: Locale;
  gettingThere: LocalizedText | null;
  whatToBring: LocalizedText[];
  etiquette: LocalizedText[];
  notIncluded: LocalizedText[];
  labels: {
    title: string;
    bring: string;
    etiquette: string;
    notIncluded: string;
    gettingThere: string;
  };
}) {
  const groups = [
    { key: "bring", icon: Backpack, title: labels.bring, items: whatToBring },
    { key: "etiquette", icon: HandHeart, title: labels.etiquette, items: etiquette },
    { key: "notIncluded", icon: CircleMinus, title: labels.notIncluded, items: notIncluded },
  ].filter((group) => group.items.length > 0);
  if (groups.length === 0 && !gettingThere) return null;

  return (
    <Reveal>
      <Card title={labels.title}>
        <div className="grid gap-6 md:grid-cols-2">
          {gettingThere && (
            <div className="md:col-span-2">
              <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
                <Navigation className="text-terracotta size-4" aria-hidden />
                {labels.gettingThere}
              </h3>
              <p className="text-ink-soft mt-2 text-sm leading-relaxed">
                {localize(gettingThere, locale)}
              </p>
            </div>
          )}
          {groups.map(({ key, icon: Icon, title, items }) => (
            <div key={key}>
              <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
                <Icon className="text-terracotta size-4" aria-hidden />
                {title}
              </h3>
              <ul className="text-ink-soft mt-2 space-y-1.5 text-sm">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="bg-sand-300 mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                    {localize(item, locale)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}
