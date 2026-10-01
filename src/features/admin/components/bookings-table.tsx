import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize, type LocalizedText } from "@/lib/i18n-text";
import type { Booking } from "@/server/db/schema";
import { nextStatuses } from "@/server/services/booking.rules";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { BookingStatusControl } from "./booking-status-control";

export type AdminBookingRow = {
  booking: Booking;
  tour: { id: number; slug: string; title: LocalizedText };
  customer: { id: string; name: string; email: string };
};

export function BookingsTable({
  rows,
  withActions = false,
}: {
  rows: AdminBookingRow[];
  withActions?: boolean;
}) {
  const t = useTranslations("admin.bookings.columns");
  const locale = useLocale();
  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  return (
    <>
      {/* Mobile: stacked cards so the status control stays reachable without sideways scrolling. */}
      <ul className="admin-stagger flex flex-col gap-3 md:hidden">
        {rows.map(({ booking, tour, customer }) => (
          <li key={booking.id} className="border-line rounded-(--radius-card) border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-xs font-semibold tracking-wide">{booking.code}</p>
              <BookingStatusBadge status={booking.status} />
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
            <dl className="border-line mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <div>
                <dt className="text-muted">{t("travelDate")}</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDate(booking.travelDate, locale, short)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("participants")}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{booking.participants}</dd>
              </div>
              <div className="text-right">
                <dt className="text-muted">{t("total")}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatCurrency(booking.totalPrice, locale)}
                </dd>
              </div>
            </dl>
            {withActions && (
              <div className="border-line mt-3 border-t pt-3">
                <BookingStatusControl
                  bookingId={booking.id}
                  code={booking.code}
                  options={nextStatuses(booking.status)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("code")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("customer")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("tour")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("travelDate")}
              </th>
              <th scope="col" className="px-5 py-4 text-right font-medium">
                {t("participants")}
              </th>
              <th scope="col" className="px-5 py-4 text-right font-medium">
                {t("total")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("status")}
              </th>
              {withActions ? (
                <th scope="col" className="px-5 py-4 font-medium">
                  {t("actions")}
                </th>
              ) : (
                <th scope="col" className="px-5 py-4 font-medium">
                  {t("created")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
            {rows.map(({ booking, tour, customer }) => (
              <tr key={booking.id} className="hover:bg-sand-50/60 align-top transition-colors">
                <td className="px-5 py-4 font-mono text-xs font-semibold tracking-wide whitespace-nowrap">
                  {booking.code}
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-muted text-xs">{customer.email}</p>
                  <p className="text-muted mt-1 text-xs">{booking.contactPhone}</p>
                </td>
                <td className="max-w-64 px-5 py-4">
                  <Link href={`/tours/${tour.slug}`} className="hover:text-terracotta line-clamp-2">
                    {localize(tour.title, locale)}
                  </Link>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {formatDate(booking.travelDate, locale, short)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{booking.participants}</td>
                <td className="px-5 py-4 text-right font-medium whitespace-nowrap tabular-nums">
                  {formatCurrency(booking.totalPrice, locale)}
                </td>
                <td className="px-5 py-4">
                  <BookingStatusBadge status={booking.status} />
                </td>
                {withActions ? (
                  <td className="px-5 py-4">
                    <BookingStatusControl
                      bookingId={booking.id}
                      code={booking.code}
                      options={nextStatuses(booking.status)}
                    />
                  </td>
                ) : (
                  <td className="text-muted px-5 py-4 whitespace-nowrap">
                    {formatDate(booking.createdAt, locale, short)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
