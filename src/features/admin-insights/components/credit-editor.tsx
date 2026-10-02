"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditForm, type CreditFormValues } from "./credit-form";

/** "Edit" toggle that reveals the credit form inline under a credit row. */
export function CreditEditor({ credit }: { credit: CreditFormValues }) {
  const t = useTranslations("adminInsights.credits");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t("editFor", { title: credit.title })}
      >
        <Pencil aria-hidden />
        {t("edit")}
      </Button>
    );
  }

  return (
    <div className="border-line mt-4 w-full border-t pt-4">
      <CreditForm mode="edit" defaults={credit} onDone={() => setOpen(false)} />
    </div>
  );
}
