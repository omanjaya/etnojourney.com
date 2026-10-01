"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "../actions";

export function CancelBookingButton({ bookingId }: { bookingId: number }) {
  const t = useTranslations("booking.cancel");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (!result.ok) setError(result.error);
      setConfirming(false);
    });

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <X aria-hidden />
          {t("trigger")}
        </Button>
        {error && (
          <p role="alert" className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("confirm")}
      className="flex flex-wrap items-center justify-end gap-2"
    >
      <span className="text-ink-soft text-sm">{t("confirm")}</span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        {t("no")}
      </Button>
      <Button variant="danger" size="sm" onClick={cancel} loading={pending}>
        {t("yes")}
      </Button>
    </div>
  );
}
