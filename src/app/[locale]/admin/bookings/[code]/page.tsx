import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Mail,
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
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BookingStatusControl } from "@/features/admin/components/booking-status-control";
import { BookingNoteForm } from "@/features/admin-booking/components/booking-note-form";
import { BookingTimeline } from "@/features/admin-booking/components/booking-timeline";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import { requireAdmin } from "@/server/auth/guards";
import { bookingService } from "@/server/services/booking.service";
import { nextStatuses } from "@/server/services/booking.rules";
import { isDomainError } from "@/server/services/errors";

const stamp: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

async function loadBooking(code: string) {
  try {
    return await bookingService.adminDetail(code);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/bookings/[code]">): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("adminBooking");
  return { title: t("metaTitle", { code }), robots: { index: false, follow: false } };
}

export default async function AdminBookingDetailPage({
  params,
}: PageProps<"/[locale]/admin/bookings/[code]">) {
  // Pages guard themselves: Next.js can render a page without its layout.
  await requireAdmin("bookings.manage");
  const { code } = await params;
  const detail = await loadBooking(code);
  const [locale, t, tc, methods] = await Promise.all([
    getLocale(),
    getTranslations("adminBooking"),
    getTranslations("common"),
    getTranslations("payment.methods"),
  ]);

  const { booking, tour, customer, payments, notes, timeline } = detail;
  const tourTitle = localize(tour.title, locale);
  // Same rule as the account page: a paid attempt wins over newer failed ones.
  const headlinePayment = payments.find((p) => p.status === "paid") ?? payments[0];

  return (
    <>
      <Link
        href="/admin/bookings"
        className="group text-ink-soft hover:text-ink short:mb-2 mb-4 -ml-2 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-medium"
      >
        <ArrowLeft
          className="size-4 transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
        {t("back")}
      </Link>

      <AdminPageHeader
        eyebrow={t("eyebrow")}
        title={booking.code}
        description={`${tourTitle} · ${t("createdOn", { date: formatDate(booking.createdAt, locale, stamp) })}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {headlinePayment && <PaymentStatusBadge status={headlinePayment.status} />}
            <BookingStatusBadge status={booking.status} />
          </div>
        }
      />

      <div className="short:gap-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="short:gap-4 flex min-w-0 flex-col gap-6">
          <Card title={t("summary.title")}>
            <div className="short:gap-4 flex flex-col gap-5">
              <div>
                <p className="text-muted text-xs">{t("summary.tour")}</p>
                <Link
                  href={`/tours/${tour.slug}`}
                  className="hover:text-terracotta font-display short:text-xl mt-1 inline-flex items-center gap-1.5 text-2xl leading-tight"
                >
                  {tourTitle}
                  <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only">{t("summary.viewTour")}</span>
                </Link>
              </div>

              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail icon={CalendarDays} label={t("summary.travelDate")}>
                  {formatDate(booking.travelDate, locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Detail>
                <Detail icon={Users} label={t("summary.participants")}>
                  {tc("people", { count: booking.participants })}
                </Detail>
                <Detail label={t("summary.unitPrice")}>
                  <span className="tabular-nums">{formatCurrency(booking.unitPrice, locale)}</span>
                </Detail>
                <Detail label={t("summary.total")}>
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {formatCurrency(booking.totalPrice, locale)}
                  </span>
                </Detail>
              </dl>

              <div className="border-line short:pt-4 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted text-xs">{t("summary.status")}</span>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div aria-label={t("summary.changeStatus")} role="group">
                  <BookingStatusControl
                    bookingId={booking.id}
                    code={booking.code}
                    options={nextStatuses(booking.status)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title={t("payments.title")}>
            {payments.length === 0 ? (
              <p className="text-muted text-sm">{t("payments.empty")}</p>
            ) : (
              <ul className="divide-line -my-4 divide-y">
                {payments.map((payment) => (
                  <li key={payment.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PaymentStatusBadge status={payment.status} />
                        {payment.refundRequired && (
                          <Badge tone="danger">
                            <CircleAlert aria-hidden />
                            {t("payments.refundRequired")}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(payment.amount, locale)}
                      </p>
                    </div>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                      <Row label={t("payments.orderId")}>
                        <span className="font-mono break-all">{payment.orderId}</span>
                      </Row>
                      <Row label={t("payments.method")}>
                        {paymentMethodLabel(payment.method, (c) => methods(c))}
                      </Row>
                      <Row label={t("payments.createdAt")}>
                        {formatDate(payment.createdAt, locale, stamp)}
                      </Row>
                      {payment.paidAt && (
                        <Row label={t("payments.paidAt")}>
                          {formatDate(payment.paidAt, locale, stamp)}
                        </Row>
                      )}
                      {payment.refundedAt && (
                        <Row label={t("payments.refundedAt")}>
                          {formatDate(payment.refundedAt, locale, stamp)}
                        </Row>
                      )}
                      {payment.refundNote && (
                        <Row label={t("payments.refundNote")} className="sm:col-span-2">
                          {payment.refundNote}
                        </Row>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("notes.title")} description={t("notes.description")}>
            <div className="flex flex-col gap-5">
              <BookingNoteForm bookingId={booking.id} />
              {notes.length === 0 ? (
                <p className="text-muted text-sm">{t("notes.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-3" aria-label={t("notes.title")}>
                  {notes.map(({ note, authorName }) => (
                    <li key={note.id} className="bg-sand-50 rounded-xl px-4 py-3">
                      <p className="text-sm leading-relaxed whitespace-pre-line">{note.body}</p>
                      <p className="text-muted mt-2 text-xs">
                        {authorName ?? t("notes.unknownAuthor")} &middot;{" "}
                        <time dateTime={note.createdAt.toISOString()}>
                          {formatDate(note.createdAt, locale, stamp)}
                        </time>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="short:gap-4 flex min-w-0 flex-col gap-6">
          <Card title={t("traveller.title")}>
            <dl className="grid gap-4 text-sm">
              <Detail icon={UserRound} label={t("traveller.account")}>
                <span className="block">{customer.name}</span>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-muted hover:text-terracotta inline-flex items-center gap-1 text-xs font-normal break-all"
                >
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  {customer.email}
                </a>
              </Detail>
              <Detail icon={UserRound} label={t("traveller.contactName")}>
                {booking.contactName}
              </Detail>
              <Detail icon={Phone} label={t("traveller.contactPhone")}>
                <a href={`tel:${booking.contactPhone}`} className="hover:text-terracotta">
                  {booking.contactPhone}
                </a>
              </Detail>
              <Detail icon={StickyNote} label={t("traveller.notes")}>
                {booking.notes ? (
                  <span className="font-normal whitespace-pre-line">{booking.notes}</span>
                ) : (
                  <span className="text-muted font-normal">{t("traveller.noNotes")}</span>
                )}
              </Detail>
            </dl>
          </Card>

          <Card title={t("timeline.title")}>
            <BookingTimeline events={timeline} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line short:p-5 rounded-(--radius-card) border bg-white p-6 md:p-7">
      <div className="short:mb-4 mb-5">
        <h2 className="text-muted font-sans text-xs font-semibold tracking-[0.2em] uppercase">
          {title}
        </h2>
        {description && <p className="text-muted mt-1 text-xs">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
