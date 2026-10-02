"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditForm, emptyCredit } from "./credit-form";

/** Collapsible form to attribute an image uploaded through the tour/destination forms. */
export function AddCredit({ suggestions }: { suggestions: string[] }) {
  const t = useTranslations("adminInsights.credits");
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="add-credit-title"
      className="border-line mb-8 rounded-(--radius-card) border bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="add-credit-title" className="text-xl">
            {t("add.title")}
          </h2>
          <p className="text-muted mt-1 text-sm">
            {suggestions.length
              ? t("add.pending", { count: suggestions.length })
              : t("add.description")}
          </p>
        </div>
        <Button
          type="button"
          variant={open ? "ghost" : "outline"}
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="add-credit-form"
        >
          <ImagePlus aria-hidden />
          {open ? t("add.close") : t("add.open")}
        </Button>
      </div>
      {open && (
        <div id="add-credit-form" className="border-line mt-5 border-t pt-5">
          <CreditForm
            mode="create"
            defaults={{ ...emptyCredit, path: suggestions[0] ?? "" }}
            suggestions={suggestions}
          />
        </div>
      )}
    </section>
  );
}
