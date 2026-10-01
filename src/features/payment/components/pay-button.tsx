"use client";

import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startPaymentAction } from "../actions";

export function PayButton({
  bookingId,
  size = "sm",
  block = false,
  className,
}: {
  bookingId: number;
  size?: "sm" | "lg";
  /** Stretch to the container width (e.g. the booking success panel). */
  block?: boolean;
  className?: string;
}) {
  const t = useTranslations("payment");
  const [pending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = () =>
    startTransition(async () => {
      setError(null);
      const result = await startPaymentAction(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRedirecting(true);
      window.location.assign(result.data.redirectUrl);
    });

  return (
    <div className={cn("flex flex-col gap-1.5", block ? "items-stretch" : "items-end", className)}>
      <Button
        size={size}
        onClick={pay}
        loading={pending || redirecting}
        className={cn(block && "w-full")}
      >
        {!(pending || redirecting) && <CreditCard aria-hidden />}
        {redirecting ? t("redirecting") : t("pay")}
      </Button>
      {error && (
        <p
          role="alert"
          className={cn("text-danger text-xs", block ? "text-center" : "max-w-64 text-right")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
