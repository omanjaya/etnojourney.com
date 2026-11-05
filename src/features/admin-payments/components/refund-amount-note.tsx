import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Payment } from "@/server/db/schema";
import { refundDue } from "@/server/services/payment.rules";

/**
 * The partial amount owed (flagged) or returned (refunded) for a payment
 * refunded under the cancellation policy, e.g. "Refund Rp 700.000 of
 * Rp 1.400.000". Renders nothing for full refunds or payments without one.
 * Server-only (payment.rules uses node:crypto).
 */
export function RefundAmountNote({
  payment,
  className,
}: {
  payment: Pick<Payment, "amount" | "refundAmount" | "refundRequired" | "status">;
  className?: string;
}) {
  const t = useTranslations("adminPayments.list");
  const ts = useTranslations("selfService.adminRefund");
  const locale = useLocale();
  const refunded = payment.status === "refunded";
  if (!payment.refundRequired && !refunded) return null;
  const due = refundDue(payment);
  if (!due.partial) return null;

  const values = {
    amount: formatCurrency(due.amount, locale),
    paid: formatCurrency(payment.amount, locale),
    percent: due.percent,
  };
  return (
    <p className={cn("text-muted text-xs", className)}>
      {refunded ? t("refundedPartial", values) : ts("partial", values)}
    </p>
  );
}
