import { ChevronRight } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize, type LocalizedText } from "@/lib/i18n-text";
import type { Booking, PaymentStatus } from "@/server/db/schema";
import { adminStatusOptions } from "@/server/services/booking.rules";
import { businessToday } from "@/server/services/self-service.rules";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { paidBookingRefund } from "../booking-refund";
import { BookingPaymentBadge } from "./booking-payment-badge";
import { BookingStatusControl } from "./booking-status-control";
import { TableScroll } from "@/components/ui/table-scroll";

export type AdminBookingRow = {
  booking: Booking;
  tour: { id: number; slug: string; title: LocalizedText };
  customer: { id: string; name: string; email: string };
  /** Paid attempt first, otherwise the latest one; null when nothing was tried. */
  paymentStatus: PaymentStatus | null;
  /** Money taken and not yet owed back (0 when unpaid). */
  paidAmount: number;
};

/**
 * Admin bookings: stacked cards on mobile, a table from `md`. The table is
 * sized to fit a 1280px laptop next to the sidebar: code and booking age
 * share a cell, and the status controls sit under the status badge.
 */
export function BookingsTable({
  rows,
  now,
  withActions = false,
}: {
  rows: AdminBookingRow[];
  /** The request time, for "booked 2 days ago" and the status options. */
  now: Date;
  withActions?: boolean;
}) {
  const t = useTranslations("admin.bookings");
  const tb = useTranslations("adminBooking");
  const locale = useLocale();
  const format = useFormatter();
  const today = businessToday(now);
  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  const createdAgo = (booking: Booking) => (
    <time
      dateTime={booking.createdAt.toISOString()}
      title={formatDate(booking.createdAt, locale, { ...short, hour: "2-digit", minute: "2-digit" })}
    >
      {t("createdAgo", { time: format.relativeTime(booking.createdAt, now) })}
    </time>
  );

  const control = ({ booking, paidAmount }: AdminBookingRow) => (
    <BookingStatusControl
      bookingId={booking.id}
      code={booking.code}
      options={adminStatusOptions(booking, today)}
      paid={paidBookingRefund(paidAmount, booking.travelDate, today)}
    />
  );

  const cell = "px-3 py-4 short:py-3 2xl:px-5";

  return (
    <>
      {/* Mobile: stacked cards so the status control stays reachable without sideways scrolling. */}
      <ul className="admin-stagger flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const { booking, tour, customer, paymentStatus } = row;
          return (
            <li key={booking.id} className="border-line rounded-(--radius-card) border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/bookings/${booking.code}`}
                  aria-label={tb("openDetail", { code: booking.code })}
                  className="hover:text-terracotta inline-flex min-h-6 items-center gap-1 font-mono text-xs font-semibold tracking-wide underline-offset-4 hover:underline"
                >
                  {booking.code}
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <BookingPaymentBadge status={paymentStatus} />
                  <BookingStatusBadge status={booking.status} />
                </div>
              </div>
              <Link
                href={`/tours/${tour.slug}`}
                className="hover:text-terracotta mt-2 block leading-snug font-medium"
              >
                {localize(tour.title, locale)}
              </Link>
              <p className="mt-1 text-sm">{customer.name}</p>
              <p className="text-muted text-xs break-all">
                {customer.email} &middot; {booking.contactPhone}
              </p>
              <p className="text-muted mt-1 text-xs">{createdAgo(booking)}</p>
              <dl className="border-line mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div>
                  <dt className="text-muted">{t("columns.travelDate")}</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(booking.travelDate, locale, short)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t("columns.participants")}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">{booking.participants}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-muted">{t("columns.total")}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatCurrency(booking.totalPrice, locale)}
                  </dd>
                </div>
              </dl>
              {withActions && <div className="border-line mt-3 border-t pt-3">{control(row)}</div>}
            </li>
          );
        })}
      </ul>

      <TableScroll label={t("columns.tableLabel")} className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className={`${cell} font-medium`}>
                {t("columns.code")}
              </th>
              <th scope="col" className={`${cell} font-medium`}>
                {t("columns.customer")}
              </th>
              <th scope="col" className={`${cell} font-medium`}>
                {t("columns.tour")}
              </th>
              <th scope="col" className={`${cell} font-medium`}>
                {t("columns.travelDate")}
              </th>
              <th scope="col" className={`${cell} text-right font-medium`}>
                {t("columns.participants")}
              </th>
              <th scope="col" className={`${cell} text-right font-medium`}>
                {t("columns.total")}
              </th>
              <th scope="col" className={`${cell} font-medium`}>
                {t("columns.status")}
              </th>
            </tr>
          </thead>
          <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
            {rows.map((row) => {
              const { booking, tour, customer, paymentStatus } = row;
              return (
                <tr key={booking.id} className="hover:bg-sand-50/60 align-top transition-colors">
                  <td className={cell}>
                    <Link
                      href={`/admin/bookings/${booking.code}`}
                      aria-label={tb("openDetail", { code: booking.code })}
                      className="hover:text-terracotta inline-flex items-center gap-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap underline-offset-4 hover:underline"
                    >
                      {booking.code}
                      <ChevronRight className="size-3.5" aria-hidden />
                    </Link>
                    <p className="text-muted mt-1 text-xs">{createdAgo(booking)}</p>
                  </td>
                  <td className={cell}>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-muted mt-1 text-xs whitespace-nowrap">
                      {booking.contactPhone}
                    </p>
                  </td>
                  <td className={`${cell} max-w-64 min-w-40`}>
                    <Link href={`/tours/${tour.slug}`} className="hover:text-terracotta line-clamp-2">
                      {localize(tour.title, locale)}
                    </Link>
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    {formatDate(booking.travelDate, locale, short)}
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>{booking.participants}</td>
                  <td className={`${cell} text-right`}>
                    <p className="font-medium whitespace-nowrap tabular-nums">
                      {formatCurrency(booking.totalPrice, locale)}
                    </p>
                    <div className="mt-1.5">
                      <BookingPaymentBadge status={paymentStatus} />
                    </div>
                  </td>
                  <td className={cell}>
                    <BookingStatusBadge status={booking.status} />
                    {withActions && <div className="mt-2">{control(row)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    </>
  );
}
