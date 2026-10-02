import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-method";
import type { Payment } from "@/server/db/schema";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge } from "./payment-status-badge";

export type AdminPaymentRow = {
  payment: Payment;
  booking: { id: number; code: string };
  customer: { id: string; name: string; email: string };
};

const dateTime: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** Admin list of payment attempts: stacked cards on mobile, a table from `md`. */
export function PaymentsTable({ rows }: { rows: AdminPaymentRow[] }) {
  const t = useTranslations("adminPayments.list");
  const tm = useTranslations("payment.methods");
  const locale = useLocale();

  const statusCell = (payment: Payment) => (
    <div className="flex flex-col items-start gap-1">
      <PaymentStatusBadge status={payment.status} />
      {payment.refundRequired && <Badge tone="terracotta">{t("refundRequired")}</Badge>}
      {payment.refundedAt && (
        <span className="text-muted text-xs">
          {t("refundedOn", { date: formatDate(payment.refundedAt, locale, dateTime) })}
        </span>
      )}
    </div>
  );

  const bookingLink = (code: string) => (
    <Link
      href={`/admin/bookings/${code}`}
      className="hover:text-terracotta font-mono text-xs font-semibold tracking-wide underline-offset-4 hover:underline"
    >
      {code}
    </Link>
  );

  return (
    <>
      <ul className="admin-stagger flex flex-col gap-3 md:hidden">
        {rows.map(({ payment, booking, customer }) => (
          <li key={payment.id} className="border-line rounded-(--radius-card) border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              {bookingLink(booking.code)}
              {statusCell(payment)}
            </div>
            <p className="text-muted mt-1 font-mono text-xs break-all">{payment.orderId}</p>
            <p className="mt-2 text-sm">{customer.name}</p>
            <p className="text-muted text-xs break-all">{customer.email}</p>
            <dl className="border-line mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <div>
                <dt className="text-muted">{t("columns.method")}</dt>
                <dd className="mt-0.5 font-medium">{paymentMethodLabel(payment.method, tm)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("columns.created")}</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDate(payment.createdAt, locale, dateTime)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-muted">{t("columns.amount")}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatCurrency(payment.amount, locale)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.booking")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.traveller")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.method")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 text-right font-medium">
                {t("columns.amount")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.status")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.created")}
              </th>
              <th scope="col" className="short:py-3 px-5 py-4 font-medium">
                {t("columns.paidAt")}
              </th>
            </tr>
          </thead>
          <tbody className="admin-stagger divide-line divide-y">
            {rows.map(({ payment, booking, customer }) => (
              <tr key={payment.id} className="hover:bg-sand-50/60 align-top transition-colors">
                <td className="short:py-3 px-5 py-4">
                  {bookingLink(booking.code)}
                  <p className="text-muted mt-1 font-mono text-xs">{payment.orderId}</p>
                </td>
                <td className="short:py-3 px-5 py-4">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-muted text-xs">{customer.email}</p>
                </td>
                <td className="short:py-3 px-5 py-4 whitespace-nowrap">
                  {paymentMethodLabel(payment.method, tm)}
                </td>
                <td className="short:py-3 px-5 py-4 text-right font-medium whitespace-nowrap tabular-nums">
                  {formatCurrency(payment.amount, locale)}
                </td>
                <td className="short:py-3 px-5 py-4">{statusCell(payment)}</td>
                <td className="text-muted short:py-3 px-5 py-4 whitespace-nowrap">
                  {formatDate(payment.createdAt, locale, dateTime)}
                </td>
                <td className="text-muted short:py-3 px-5 py-4 whitespace-nowrap">
                  {payment.paidAt ? formatDate(payment.paidAt, locale, dateTime) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
