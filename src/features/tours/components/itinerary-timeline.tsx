import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ItineraryDay } from "@/server/db/schema";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { Reveal } from "@/components/motion";
import "../view-transitions.css";

/**
 * Day-by-day plan. When it scrolls into view the vertical line draws down and
 * the days follow it in sequence (styles in view-transitions.css).
 */
export function ItineraryTimeline({ days, locale }: { days: ItineraryDay[]; locale: Locale }) {
  const t = useTranslations("tours.detail");
  return (
    <Reveal variant="none">
      <ol className="relative space-y-10 pl-10">
        <span aria-hidden className="ej-timeline-line bg-line absolute inset-y-0 left-0 w-px" />
        {days.map((day, i) => (
          <li
            key={day.id}
            className="ej-timeline-item relative"
            style={{ "--i": i } as CSSProperties}
          >
            <span
              className="border-line bg-sand-50 font-display text-terracotta absolute top-0 -left-[3.05rem] grid size-8 place-items-center rounded-full border text-sm font-semibold"
              aria-hidden
            >
              {day.day}
            </span>
            <p className="eyebrow">{t("day", { day: day.day })}</p>
            <h3 className="mt-2 text-2xl">{localize(day.title, locale)}</h3>
            <p className="text-ink-soft mt-3 leading-relaxed">
              {localize(day.description, locale)}
            </p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
