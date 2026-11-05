"use client";

import { CalendarX2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type RefObject } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RefundMode } from "@/server/services/booking.rules";

export type PaidBookingRefund = {
  /** Money taken for the booking and not yet owed back. */
  amount: number;
  /** What the cancellation policy gives back today (the server re-checks). */
  policyPercent: number;
  policyAmount: number;
};

/**
 * Asks how much goes back before an admin cancels a paid booking: the
 * cancellation-policy share (the guest asked to cancel) or everything (we
 * cancel). Opened by `BookingStatusControl` through `dialogRef`.
 */
export function CancelPaidBookingDialog({
  dialogRef,
  code,
  paid,
  pending,
  error,
  onConfirm,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  code: string;
  paid: PaidBookingRefund;
  pending: boolean;
  error: string | null;
  onConfirm: (mode: RefundMode) => void;
}) {
  const t = useTranslations("admin.bookings.cancelPaid");
  const locale = useLocale();
  const titleId = useId();
  const name = useId();
  const [mode, setMode] = useState<RefundMode>("policy");
  const money = (value: number) => formatCurrency(value, locale);
  // When the policy already gives everything back, there is nothing to choose.
  const choice = paid.policyPercent < 100;

  const options: { value: RefundMode; label: string; refund: string; hint: string }[] = [
    {
      value: "policy",
      label: t("policy"),
      refund: t("policyRefund", { percent: paid.policyPercent, amount: money(paid.policyAmount) }),
      hint: t("policyHint"),
    },
    {
      value: "full",
      label: t("full"),
      refund: money(paid.amount),
      hint: t("fullHint"),
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === dialogRef.current && !pending) dialogRef.current?.close();
      }}
      className="bg-sand-50 text-ink m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-(--radius-card) p-0 text-left shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="short:p-5 p-6 md:p-8">
        <span className="bg-danger-light text-danger short:size-10 grid size-12 place-items-center rounded-full">
          <CalendarX2 className="size-5" aria-hidden />
        </span>
        <h2 id={titleId} className="short:mt-3 short:text-xl mt-5 text-2xl">
          {t("title", { code })}
        </h2>
        <p className="text-ink-soft mt-2 text-sm">{t("paid", { amount: money(paid.amount) })}</p>

        {choice ? (
          <fieldset className="short:mt-3 mt-4 flex flex-col gap-2">
            <legend className="sr-only">{t("paid", { amount: money(paid.amount) })}</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border bg-white px-4 py-3 transition-colors",
                  mode === option.value ? "border-terracotta" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="accent-terracotta mt-1 size-4 shrink-0"
                />
                <span className="text-sm">
                  <span className="block font-semibold">
                    {option.label}: {option.refund}
                  </span>
                  <span className="text-muted mt-0.5 block text-xs">{option.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="border-line short:mt-3 mt-4 rounded-xl border bg-white px-4 py-3 text-sm font-semibold">
            {t("policyFull", { amount: money(paid.amount) })}
          </p>
        )}

        <p className="text-muted mt-3 text-xs">{t("processing")}</p>
        <p className="text-muted mt-2 text-xs">{t("irreversible")}</p>

        {error && <Alert className="mt-4">{error}</Alert>}

        <div className="short:mt-5 mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
          >
            {t("keep")}
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={() => onConfirm(choice ? mode : "policy")}
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
