"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common.locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: Locale) =>
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        pending && "opacity-60",
        className,
      )}
    >
      <Globe className="mr-1 size-4 opacity-70" aria-hidden />
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          lang={l}
          className={cn(
            "inline-grid min-h-9 min-w-9 place-items-center rounded-full px-2.5 uppercase transition-colors",
            l === locale ? "bg-current/10" : "opacity-80 hover:opacity-100",
          )}
        >
          {/* Accessible name ("ID Indonesia") starts with the visible text for voice control. */}
          {l}
          <span className="sr-only"> {t(l)}</span>
        </button>
      ))}
    </div>
  );
}
