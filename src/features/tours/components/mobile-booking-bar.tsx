"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import "../view-transitions.css";

/**
 * Persistent price + booking shortcut on small screens, where the booking
 * panel sits far below the fold. Hidden from `lg` up (the panel is sticky there).
 *
 * Rises from the bottom edge shortly after load (CSS only, so it also appears
 * without JS). Once hydrated, it slides away while the booking panel itself or
 * the footer is on screen, so it never duplicates the panel or covers content.
 */
export function MobileBookingBar({ pricePerPerson }: { pricePerPerson: number }) {
  const locale = useLocale();
  const t = useTranslations("tours.detail");
  const tc = useTranslations("common");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets = [document.getElementById("booking"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setHidden(visible.size > 0);
    });
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      inert={hidden}
      aria-hidden={hidden || undefined}
      data-hidden={hidden || undefined}
      className="ej-rise-in border-line bg-sand-50/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-[translate] duration-500 ease-(--ease-editorial) data-hidden:translate-y-full lg:hidden"
    >
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
