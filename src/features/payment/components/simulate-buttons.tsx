"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { simulatePaymentAction } from "../actions";

export function SimulateButtons({ orderId }: { orderId: string }) {
  const t = useTranslations("payment.simulate");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (outcome: "paid" | "failed") =>
    startTransition(async () => {
      setError(null);
      const result = await simulatePaymentAction({ orderId, outcome });
      if (result && !result.ok) setError(result.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => run("paid")} loading={pending}>
          {!pending && <CircleCheck aria-hidden />}
          {t("success")}
        </Button>
        <Button variant="outline" onClick={() => run("failed")} disabled={pending}>
          <CircleX aria-hidden />
          {t("failure")}
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
