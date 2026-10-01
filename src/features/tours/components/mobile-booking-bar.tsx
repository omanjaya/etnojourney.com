import { useLocale, useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import "../view-transitions.css";

/**
 * Persistent price + booking shortcut on small screens, where the booking
 * panel sits far below the fold. Hidden from `lg` up (the panel is sticky there).
 * Rises from the bottom edge shortly after load (CSS only, so it also appears without JS).
 */
export function MobileBookingBar({ pricePerPerson }: { pricePerPerson: number }) {
  const locale = useLocale();
  const t = useTranslations("tours.detail");
  const tc = useTranslations("common");

  return (
    <div className="ej-rise-in border-line bg-sand-50/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="leading-tight">
          <span className="text-muted block text-[11px] tracking-wide uppercase">{tc("from")}</span>
          <span className="font-semibold whitespace-nowrap">
            {formatCurrency(pricePerPerson, locale)}
          </span>{" "}
          <span className="text-muted text-sm whitespace-nowrap">{tc("perPerson")}</span>
        </p>
        <a href="#booking" className={buttonVariants({ size: "md", className: "group/cta" })}>
          {t("bookCta")}
          <ArrowDown
            aria-hidden
            className="transition-transform duration-500 group-hover/cta:translate-y-0.5"
          />
        </a>
      </div>
    </div>
  );
}
