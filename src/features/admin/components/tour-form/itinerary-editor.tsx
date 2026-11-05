import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { BilingualField } from "../form-parts/bilingual-field";
import { Section } from "../form-parts/section";
import { emptyText, type TourFormDefaults, type TourSectionProps } from "./defaults";

type Day = TourFormDefaults["itinerary"][number];

/**
 * Add, edit and remove itinerary days (bilingual title + description each).
 * The schema needs one entry per day of the duration; the editor checks that
 * count live and only adds days up to it. Days are never removed
 * automatically, so lowering the duration can't throw away written text.
 */
export function ItineraryEditor({ values, set, err }: TourSectionProps) {
  const t = useTranslations("admin.form");
  const days = values.itinerary;
  const total =
    typeof values.durationDays === "number" && values.durationDays > 0 ? values.durationDays : null;
  const mismatch = total !== null && days.length !== total;
  const full = total !== null && days.length >= total;
  // Errors inside a day show on that day. The section-level error is about the
  // day count, which the live check covers whenever the duration is known.
  const dayHasError = days.some((_, index) => err(`itinerary.${index}`));
  const sectionError = total === null && !dayHasError ? err("itinerary") : undefined;

  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  // The removed day's button is gone: focus the day that took its place,
  // the previous one, or "Add day" when none is left.
  const removeDay = (index: number) => {
    flushSync(() =>
      set(
        "itinerary",
        days.filter((_, i) => i !== index),
      ),
    );
    const buttons = listRef.current?.querySelectorAll<HTMLElement>("[data-remove-day]") ?? [];
    (buttons[Math.min(index, buttons.length - 1)] ?? addRef.current)?.focus();
  };

  const updateDay = (index: number, patch: Partial<Day>) =>
    set(
      "itinerary",
      days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );

  return (
    <Section id="tour-itinerary" title={t("sections.itinerary")} hint={t("sections.itineraryHint")}>
      {sectionError && (
        <p role="alert" className="text-danger text-xs">
          {sectionError}
        </p>
      )}
      {mismatch && (
        <p className="text-danger flex items-start gap-2 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("itinerary.mismatch", { total, days: days.length })}
        </p>
      )}
      {days.length === 0 && (
        <p className="border-line text-muted rounded-xl border border-dashed p-6 text-center text-sm">
          {t("itinerary.empty")}
        </p>
      )}
      <ol ref={listRef} className="flex flex-col gap-5">
        {days.map((day, index) => (
          <li key={index} className="border-line bg-sand-50 rounded-xl border p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="font-display text-lg">
                {/* A day past the duration has no "of N"; the mismatch warning explains it. */}
                {total !== null && index < total
                  ? t("itinerary.dayOf", { day: index + 1, total })
                  : t("itinerary.day", { day: index + 1 })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted hover:text-danger size-9"
                aria-label={t("itinerary.remove", { day: index + 1 })}
                data-remove-day=""
                onClick={() => removeDay(index)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              <BilingualField
                name={`itinerary-${index}-title`}
                label={t("itinerary.dayTitle")}
                value={day.title}
                onChange={(title) => updateDay(index, { title })}
                error={err(`itinerary.${index}.title`)}
              />
              <BilingualField
                name={`itinerary-${index}-description`}
                label={t("itinerary.dayDescription")}
                value={day.description}
                onChange={(description) => updateDay(index, { description })}
                error={err(`itinerary.${index}.description`)}
                multiline
                rows={3}
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-start gap-2">
        <Button
          ref={addRef}
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          aria-describedby={full ? "itinerary-add-limit" : undefined}
          onClick={() =>
            set("itinerary", [...days, { title: emptyText(), description: emptyText() }])
          }
        >
          <Plus aria-hidden />
          {t("itinerary.add")}
        </Button>
        {full && (
          <p id="itinerary-add-limit" className="text-muted text-xs">
            {t("itinerary.addLimit")}
          </p>
        )}
      </div>
    </Section>
  );
}
