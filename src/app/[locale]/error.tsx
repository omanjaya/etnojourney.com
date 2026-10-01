"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.error");
  return (
    <main className="grid min-h-dvh place-items-center bg-sand-100 px-6 text-center">
      <div className="max-w-md">
        <TriangleAlert className="mx-auto size-10 text-terracotta" strokeWidth={1.5} aria-hidden />
        <h1 className="mt-6 text-4xl">{t("title")}</h1>
        <p className="mt-4 text-ink-soft">{t("description")}</p>
        <Button className="mt-8" onClick={reset}>{t("retry")}</Button>
      </div>
    </main>
  );
}
