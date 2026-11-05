"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/server/db/schema";
import type { RefundMode } from "@/server/services/booking.rules";
import { updateBookingStatusAction } from "../actions";
import { CancelPaidBookingDialog, type PaidBookingRefund } from "./cancel-paid-booking-dialog";

/**
 * Renders one button per allowed next status. Terminal bookings show a muted
 * label. Every change is confirmed first: confirming an unpaid booking and
 * completing one with `window.confirm`, cancelling a paid one with a dialog
 * that asks how much goes back.
 */
export function BookingStatusControl({
  bookingId,
  code,
  options,
  paid,
}: {
  bookingId: number;
  code: string;
  options: readonly BookingStatus[];
  /** Money taken for the booking, or null when it hasn't been paid. */
  paid: PaidBookingRefund | null;
}) {
  const t = useTranslations("admin.bookings");
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const cancelDialogRef = useRef<HTMLDialogElement>(null);

  if (options.length === 0) {
    return <span className="text-muted text-xs">{t("noActions")}</span>;
  }

  const run = (status: BookingStatus, refund?: RefundMode) => {
    setError(null);
    setDialogError(null);
    setTarget(status);
    startTransition(async () => {
      const result = await updateBookingStatusAction(bookingId, status, refund);
      if (result.ok) cancelDialogRef.current?.close();
      else if (refund) setDialogError(result.error);
      else setError(result.error);
      setTarget(null);
    });
  };

  const question = (status: BookingStatus): string | null => {
    if (status === "cancelled") return t("confirmCancel", { code });
    if (status === "completed") return t("confirmComplete", { code });
    // A paid booking is confirmed automatically, so this is a confirmation without payment.
    if (status === "confirmed" && !paid) return t("confirmUnpaid", { code });
    return null;
  };

  const change = (status: BookingStatus) => {
    if (status === "cancelled" && paid) {
      setDialogError(null);
      cancelDialogRef.current?.showModal();
      return;
    }
    const text = question(status);
    if (text && !window.confirm(text)) return;
    run(status);
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 md:w-auto md:items-start">
      <div className="flex flex-wrap gap-2">
        {options.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={status === "cancelled" ? "outline" : "dark"}
            // Full-size touch targets on mobile cards, compact inside the desktop table.
            className={cn(
              "h-10 flex-1 px-3 md:h-8 md:flex-none",
              status === "cancelled" && "text-danger",
            )}
            loading={pending && target === status}
            disabled={pending}
            onClick={() => change(status)}
          >
            {t(`actions.${status}`)}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-danger animate-fade-up max-w-48 text-xs">
          {error}
        </p>
      )}
      {paid && options.includes("cancelled") && (
        <CancelPaidBookingDialog
          dialogRef={cancelDialogRef}
          code={code}
          paid={paid}
          pending={pending}
          error={dialogError}
          onConfirm={(mode) => run("cancelled", mode)}
        />
      )}
    </div>
  );
}
