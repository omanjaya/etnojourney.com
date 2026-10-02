"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import type { LocalizedText } from "@/lib/i18n-text";
import type { TourCategory } from "@/server/db/schema";
import { createTourAction, updateTourAction } from "../actions";
import type { TourFormValues } from "../schemas";
import { BilingualField } from "./form-parts/bilingual-field";
import { Section } from "./form-parts/section";
import { slugify } from "./form-parts/slug";
import type { SetTourField, TourFormDefaults } from "./tour-form/defaults";
import { DetailsSection } from "./tour-form/details-section";
import { ItineraryEditor } from "./tour-form/itinerary-editor";
import { pairLines, splitPairs } from "./tour-form/lines";
import { ListFieldsSection } from "./tour-form/list-fields";
import { MediaSection } from "./tour-form/media-section";
import { PracticalSection } from "./tour-form/practical-section";
import { VisibilitySection } from "./tour-form/visibility-section";

export { emptyTourDefaults, type TourFormDefaults } from "./tour-form/defaults";

/**
 * Create/edit form for a tour. Owns all form state and submission; each
 * section component renders one group of fields from the shared state.
 */
export function TourForm({
  mode,
  tourId,
  defaults,
  destinations,
}: {
  mode: "create" | "edit";
  tourId?: number;
  defaults: TourFormDefaults;
  destinations: { id: number; name: string; province: string }[];
}) {
  const t = useTranslations("admin.form");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const [values, setValues] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [highlightsText, setHighlightsText] = useState(splitPairs(defaults.highlights));
  const [includedText, setIncludedText] = useState(splitPairs(defaults.included));
  const [notIncludedText, setNotIncludedText] = useState(splitPairs(defaults.notIncluded));
  const [whatToBringText, setWhatToBringText] = useState(splitPairs(defaults.whatToBring));
  const [etiquetteText, setEtiquetteText] = useState(splitPairs(defaults.etiquette));

  const set: SetTourField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldErrors[key]?.[0];

  // The slug follows the Indonesian title until an admin edits it by hand.
  const setTitle = (title: LocalizedText) => {
    setValues((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugify(title.id),
    }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload: TourFormValues = {
      ...values,
      destinationId: values.destinationId === "" ? 0 : values.destinationId,
      category: (values.category || undefined) as TourCategory,
      durationDays: values.durationDays === "" ? 0 : values.durationDays,
      pricePerPerson: values.pricePerPerson === "" ? 0 : values.pricePerPerson,
      maxParticipants: values.maxParticipants === "" ? 0 : values.maxParticipants,
      highlights: pairLines(highlightsText),
      included: pairLines(includedText),
      notIncluded: pairLines(notIncludedText),
      whatToBring: pairLines(whatToBringText),
      etiquette: pairLines(etiquetteText),
    };

    startTransition(async () => {
      const result =
        mode === "edit" && tourId
          ? await updateTourAction(tourId, payload)
          : await createTourAction(payload);
      // Success redirects on the server, so only failures return here.
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const sectionProps = { values, set, err };

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col">
      {error && <Alert className="mb-8">{error}</Alert>}

      <div className="border-line rounded-(--radius-card) border bg-white p-6 md:p-10">
        <Section title={t("sections.basics")} hint={t("sections.basicsHint")}>
          <BilingualField
            name="title"
            label={t("fields.title")}
            value={values.title}
            onChange={setTitle}
            error={err("title")}
          />
          <Field
            label={t("fields.slug")}
            htmlFor="slug"
            error={err("slug")}
            hint={t("fields.slugHint")}
          >
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className="font-mono"
              aria-invalid={err("slug") ? true : undefined}
              aria-describedby={err("slug") ? "slug-error" : undefined}
            />
          </Field>
          <BilingualField
            name="summary"
            label={t("fields.summary")}
            value={values.summary}
            onChange={(v) => set("summary", v)}
            error={err("summary")}
            multiline
            rows={3}
          />
          <BilingualField
            name="description"
            label={t("fields.description")}
            value={values.description}
            onChange={(v) => set("description", v)}
            error={err("description")}
            multiline
            rows={7}
          />
        </Section>

        <DetailsSection {...sectionProps} destinations={destinations} />
        <MediaSection {...sectionProps} />
        <ListFieldsSection
          highlights={{ value: highlightsText, onChange: setHighlightsText }}
          included={{ value: includedText, onChange: setIncludedText }}
          err={err}
        />
        <PracticalSection
          difficulty={values.difficulty}
          onDifficultyChange={(v) => set("difficulty", v)}
          notIncluded={{ value: notIncludedText, onChange: setNotIncludedText }}
          whatToBring={{ value: whatToBringText, onChange: setWhatToBringText }}
          etiquette={{ value: etiquetteText, onChange: setEtiquetteText }}
          err={err}
        />
        <ItineraryEditor {...sectionProps} />
        <VisibilitySection values={values} set={set} />
      </div>

      <div className="border-line bg-sand-50/90 sticky bottom-0 z-10 -mx-4 mt-8 flex justify-end border-t px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <Button type="submit" size="lg" loading={pending}>
          {!pending && <Save aria-hidden />}
          {mode === "edit" ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
