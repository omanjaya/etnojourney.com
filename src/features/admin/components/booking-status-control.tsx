"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/server/db/schema";
import { updateBookingStatusAction } from "../actions";

/** Renders one button per allowed next status. Terminal bookings show a muted label. */
export function BookingStatusControl({
  bookingId,
  code,
  options,
}: {
  bookingId: number;
  code: string;
  options: readonly BookingStatus[];
}) {
  const t = useTranslations("admin.bookings");
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return <span className="text-muted text-xs">{t("noActions")}</span>;
  }

  const change = (status: BookingStatus) => {
    if (status === "cancelled" && !window.confirm(t("confirmCancel", { code }))) return;
    setError(null);
    setTarget(status);
    startTransition(async () => {
      const result = await updateBookingStatusAction(bookingId, status);
      if (!result.ok) setError(result.error);
      setTarget(null);
    });
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
    </div>
  );
}
