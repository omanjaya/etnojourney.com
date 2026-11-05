import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BilingualField } from "../form-parts/bilingual-field";
import { Section } from "../form-parts/section";
import { emptyText, type TourFormDefaults, type TourSectionProps } from "./defaults";

type Day = TourFormDefaults["itinerary"][number];

/** Add, edit and remove itinerary days (bilingual title + description each). */
export function ItineraryEditor({ values, set, err }: TourSectionProps) {
  const t = useTranslations("admin.form");
  const days = values.itinerary;

  const updateDay = (index: number, patch: Partial<Day>) =>
    set(
      "itinerary",
      days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );

  return (
    <Section title={t("sections.itinerary")} hint={t("sections.itineraryHint")}>
      {err("itinerary") && (
        <p role="alert" className="text-danger text-xs">
          {err("itinerary")}
        </p>
      )}
      {days.length === 0 && (
        <p className="border-line text-muted rounded-xl border border-dashed p-6 text-center text-sm">
          {t("itinerary.empty")}
        </p>
      )}
      <ol className="flex flex-col gap-5">
        {days.map((day, index) => (
          <li key={index} className="border-line bg-sand-50 rounded-xl border p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="font-display text-lg">{t("itinerary.day", { day: index + 1 })}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted hover:text-danger size-9"
                aria-label={t("itinerary.remove", { day: index + 1 })}
                onClick={() =>
                  set(
                    "itinerary",
                    days.filter((_, i) => i !== index),
                  )
                }
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
              />
              <BilingualField
                name={`itinerary-${index}-description`}
                label={t("itinerary.dayDescription")}
                value={day.description}
                onChange={(description) => updateDay(index, { description })}
                multiline
                rows={3}
              />
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set("itinerary", [...days, { title: emptyText(), description: emptyText() }])
          }
        >
          <Plus aria-hidden />
          {t("itinerary.add")}
        </Button>
      </div>
    </Section>
  );
}
