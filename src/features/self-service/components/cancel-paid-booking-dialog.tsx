"use client";

import { CalendarX2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RefundQuote, TierRange } from "@/server/services/self-service.rules";
import { cancelOwnBookingAction } from "../actions";
import { rangeFor, tierRangeMessage } from "../tier-copy";

/**
 * "Cancel booking" for a paid booking: a modal that shows the policy tier
 * that applies today and the refund amount (or that none applies) before
 * the traveller confirms. The server recomputes everything and refuses if the
 * tier moved in the meantime.
 */
export function CancelPaidBookingDialog({
  bookingId,
  code,
  paidAmount,
  quote,
  ranges,
}: {
  bookingId: number;
  code: string;
  paidAmount: number;
  quote: Pick<RefundQuote, "daysBefore" | "percent" | "amount">;
  ranges: TierRange[];
}) {
  const t = useTranslations("selfService");
  const locale = useLocale();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const range = rangeFor(ranges, quote.daysBefore);
  const label = range ? tierRangeMessage(range) : null;
  const refundable = quote.amount > 0;

  const close = () => dialogRef.current?.close();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelOwnBookingAction(bookingId, quote.percent);
      if (result.ok) {
        close();
        return;
      }
      setError(result.error);
      // The tier may have moved (e.g. past midnight): reload the quote shown here.
      router.refresh();
    });
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted hover:text-danger"
        aria-label={t("cancel.triggerFor", { code })}
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
      >
        <X aria-hidden />
        {t("cancel.trigger")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === dialogRef.current && !pending) close();
        }}
        className="bg-sand-50 text-ink m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-(--radius-card) p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="short:p-5 p-6 md:p-8">
          <span className="bg-danger-light text-danger short:size-10 grid size-12 place-items-center rounded-full">
            <CalendarX2 className="size-5" aria-hidden />
          </span>
          <h2 id={titleId} className="short:mt-3 short:text-xl mt-5 text-2xl">
            {t("cancel.title", { code })}
          </h2>
          <p className="text-ink-soft mt-2 text-sm">
            {t("cancel.timing", { days: quote.daysBefore })}
          </p>

          <div
            data-testid="cancel-refund-summary"
            className={cn(
              "short:mt-3 mt-4 rounded-xl border px-4 py-3",
              refundable ? "border-line bg-white" : "border-danger/30 bg-danger-light/40",
            )}
          >
            {label && (
              <p className="text-muted text-xs font-medium">
                {t(`tier.${label.key}`, label.values)}
              </p>
            )}
            <p className="mt-1 font-semibold">{t("tier.refund", { percent: quote.percent })}</p>
            {refundable ? (
              <p className="text-ink-soft mt-1 text-sm">
                {t("cancel.refundAmount", {
                  amount: formatCurrency(quote.amount, locale),
                  paid: formatCurrency(paidAmount, locale),
                })}
              </p>
            ) : (
              <p className="text-ink-soft mt-1 text-sm">{t("cancel.noRefund")}</p>
            )}
          </div>

          {refundable && <p className="text-muted mt-3 text-xs">{t("cancel.processing")}</p>}
          <p className="text-muted mt-2 text-xs">{t("cancel.irreversible")}</p>
          <p className="mt-3 text-xs">
            <Link
              href="/cancellation-policy"
              target="_blank"
              className="text-terracotta font-medium underline-offset-4 hover:underline"
            >
              {t("panel.policyLink")}
            </Link>
          </p>

          {error && <Alert className="mt-4">{error}</Alert>}

          <div className="short:mt-5 mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              {t("cancel.keep")}
            </Button>
            <Button type="button" variant="danger" onClick={confirm} loading={pending}>
              {t("cancel.confirm")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
