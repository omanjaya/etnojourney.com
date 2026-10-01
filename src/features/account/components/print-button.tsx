"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useTranslations("account.bookingDetail");
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden />
      {t("print")}
    </Button>
  );
}
