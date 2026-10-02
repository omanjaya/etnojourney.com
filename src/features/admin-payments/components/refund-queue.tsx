import { CircleCheck, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import type { paymentService } from "@/server/services/payment.service";
import { RecordRefundDialog } from "./record-refund-dialog";

export type RefundQueueItem = Awaited<ReturnType<typeof paymentService.refundQueue>>[number];

/** Paid payments whose money must go back, oldest first, each with a "Record refund" form. */
export function RefundQueue({ items }: { items: RefundQueueItem[] }) {
  const t = useTranslations("adminPayments");
  const locale = useLocale();

  return (
    <section
      aria-labelledby="refund-queue-title"
      className={cn(
        "short:mb-6 short:p-4 mb-10 rounded-(--radius-card) border p-5 md:p-6",
        items.length ? "border-terracotta/30 bg-white" : "border-line bg-white/60",
      )}
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <h2 id="refund-queue-title" className="short:text-xl text-2xl">
          {t("queue.title")}
        </h2>
        {items.length > 0 && (
          <p className="text-terracotta text-sm font-medium" aria-live="polite">
            {t("queue.count", { count: items.length })}
          </p>
        )}
      </div>
      <p className="text-ink-soft mt-1 max-w-3xl text-sm">{t("queue.description")}</p>

      {items.length === 0 ? (
        <p className="text-muted mt-4 flex items-center gap-2 text-sm">
          <CircleCheck className="text-leaf size-4 shrink-0" aria-hidden />
          {t("queue.empty")}
        </p>
      ) : (
        <ul className="divide-line border-line mt-4 divide-y border-t">
          {items.map(({ payment, booking, tour, customer, reason, ageDays }) => {
            const amount = formatCurrency(payment.amount, locale);
            return (
              <li
                key={payment.id}
                data-testid="refund-queue-item"
                className="short:py-3 grid gap-3 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto_auto] md:items-center md:gap-6"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/bookings/${booking.code}`}
                    className="hover:text-terracotta font-mono text-sm font-semibold tracking-wide underline-offset-4 hover:underline"
                  >
                    {booking.code}
                  </Link>
                  <p className="text-muted mt-0.5 font-mono text-xs break-all">
                    {t("queue.orderId")}: {payment.orderId}
                  </p>
                  <p className="mt-1 text-sm">{customer.name}</p>
                  <p className="text-muted text-xs break-all">{customer.email}</p>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm">{localize(tour.title, locale)}</p>
                  <p className="text-ink-soft mt-1 text-xs font-medium">
                    {t(`reasons.${reason ?? "unknown"}`)}
                  </p>
                  <p className="text-muted mt-1 flex items-center gap-1.5 text-xs">
                    <Clock className="size-3.5" aria-hidden />
                    {t("queue.flaggedAge", { days: ageDays })}
                  </p>
                </div>
                <p className="text-lg font-medium tabular-nums md:text-right">{amount}</p>
                <RecordRefundDialog
                  paymentId={payment.id}
                  code={booking.code}
                  amountLabel={amount}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
