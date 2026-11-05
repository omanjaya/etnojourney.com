"use client";

import { CircleCheck, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { useUploadTracker } from "@/features/media/components/use-upload-tracker";
import type { LocalizedText } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import type { TourCategory } from "@/server/db/schema";
import { createTourAction, updateTourAction } from "../actions";
import type { TourFormValues } from "../schemas";
import { BilingualField } from "./form-parts/bilingual-field";
import { Section } from "./form-parts/section";
import { slugify } from "./form-parts/slug";
import { useFocusError } from "./form-parts/use-focus-error";
import { useLeaveGuard } from "./form-parts/use-leave-guard";
import type { SetTourField, TourFormDefaults } from "./tour-form/defaults";
import { DetailsSection } from "./tour-form/details-section";
import { ItineraryEditor } from "./tour-form/itinerary-editor";
import { pairLines, splitPairs } from "./tour-form/lines";
import { ListFieldsSection } from "./tour-form/list-fields";
import { LiveVisibilitySection, type TourPublishing } from "./tour-form/live-visibility-section";
import { MediaSection } from "./tour-form/media-section";
import { PracticalSection } from "./tour-form/practical-section";
import { tourSectionId, tourSections } from "./tour-form/sections";
import { VisibilitySection } from "./tour-form/visibility-section";

export { emptyTourDefaults, type TourFormDefaults } from "./tour-form/defaults";
export type { TourPublishing } from "./tour-form/live-visibility-section";

/**
 * Create/edit form for a tour. Owns all form state and submission; each
 * section component renders one group of fields from the shared state.
 *
 * Edit mode saves in place (a "saved" note in the save bar) and sends back the
 * `version` it was opened with, so a newer save by someone else is refused
 * rather than overwritten. Publish and featured are instant switches there.
 * Leaving with unsaved changes asks first; a failed save focuses the first
 * field with an error.
 */
export function TourForm({
  mode,
  tourId,
  defaults,
  destinations,
  version,
  publishing,
  placeholderImages,
}: {
  mode: "create" | "edit";
  tourId?: number;
  defaults: TourFormDefaults;
  destinations: { id: number; name: string; province: string }[];
  /** Edit mode: the edit version of the tour as loaded. */
  version?: string;
  /** Edit mode: the saved publish state, for the instant switches. */
  publishing?: TourPublishing;
  /** Cover/gallery images credited as temporary AI placeholders. */
  placeholderImages?: string[];
}) {
  const t = useTranslations("admin.form");
  const tm = useTranslations("media.form");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  // A save sent while a photo is still uploading would keep the old photo.
  const uploads = useUploadTracker();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  // Bumped on every failed save so the error focus runs again.
  const [failures, setFailures] = useState(0);
  const [savedVersion, setSavedVersion] = useState(version ?? "");
  const [saved, setSaved] = useState<"saved" | "unchanged" | null>(null);

  const [values, setValues] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [highlightsText, setHighlightsText] = useState(splitPairs(defaults.highlights));
  const [includedText, setIncludedText] = useState(splitPairs(defaults.included));
  const [notIncludedText, setNotIncludedText] = useState(splitPairs(defaults.notIncluded));
  const [whatToBringText, setWhatToBringText] = useState(splitPairs(defaults.whatToBring));
  const [etiquetteText, setEtiquetteText] = useState(splitPairs(defaults.etiquette));

  // Unsaved changes: everything the form holds, compared with the last save.
  const snapshot = JSON.stringify([
    values,
    highlightsText,
    includedText,
    notIncludedText,
    whatToBringText,
    etiquetteText,
  ]);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;
  useLeaveGuard(dirty && !pending, t("unsavedConfirm"));
  useFocusError(formRef, failures);

  const set: SetTourField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldErrors[key]?.[0];

  // A live tour keeps its address (the server refuses a change too).
  const slugLocked = mode === "edit" && Boolean(publishing?.isPublished);
  const slugHint = slugLocked
    ? t("fields.slugLockedHint")
    : mode === "edit"
      ? t("fields.slugHintEdit")
      : t("fields.slugHint");

  // The slug follows the Indonesian title until an admin edits it by hand.
  const setTitle = (title: LocalizedText) => {
    setValues((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugify(title.id),
    }));
  };

  const showFailure = (result: {
    error: string;
    fieldErrors?: Record<string, string[] | undefined>;
  }) => {
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
    setFailures((n) => n + 1);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (uploads.uploading) return;
    setError(null);
    setFieldErrors({});
    setSaved(null);

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
    const submitted = snapshot;

    startTransition(async () => {
      if (mode === "edit" && tourId) {
        const result = await updateTourAction(tourId, payload, savedVersion);
        if (!result.ok) return showFailure(result);
        setSavedVersion(result.data.version);
        setSavedSnapshot(submitted);
        setSaved(result.data.changed ? "saved" : "unchanged");
        return;
      }
      // Creating redirects to the new tour's edit page, so only failures return here.
      const result = await createTourAction(payload);
      if (!result.ok) showFailure(result);
    });
  };

  const sectionProps = { values, set, err };

  return (
    <form ref={formRef} method="post" onSubmit={submit} noValidate className="flex flex-col">
      {/* Jump bar: the form is long, so each section is one click away. */}
      <nav
        aria-label={t("jumpTo")}
        className="border-line bg-sand-50/95 sticky top-16 z-20 -mx-4 mb-6 border-b px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-12 lg:px-12"
      >
        <ul className="flex scrollbar-none gap-2 overflow-x-auto">
          {tourSections.map((key) => (
            <li key={key} className="shrink-0">
              <a
                href={`#${tourSectionId(key)}`}
                className="border-line text-ink-soft hover:border-sand-300 hover:text-ink inline-flex min-h-9 items-center rounded-full border bg-white px-3.5 text-sm transition-colors"
              >
                {t(`sections.${key}`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {error && <Alert className="mb-8">{error}</Alert>}

      <div className="border-line rounded-(--radius-card) border bg-white p-6 md:p-10">
        <Section
          id={tourSectionId("basics")}
          title={t("sections.basics")}
          hint={t("sections.basicsHint")}
        >
          <BilingualField
            name="title"
            label={t("fields.title")}
            value={values.title}
            onChange={setTitle}
            error={err("title")}
          />
          <Field label={t("fields.slug")} htmlFor="slug" error={err("slug")} hint={slugHint}>
            <Input
              id="slug"
              value={values.slug}
              readOnly={slugLocked}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className={cn("font-mono", slugLocked && "bg-sand-50 text-muted")}
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
        <MediaSection
          {...sectionProps}
          placeholderImages={placeholderImages}
          onUploadingChange={uploads.report}
        />
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
        {mode === "edit" && tourId && publishing ? (
          <LiveVisibilitySection tourId={tourId} publishing={publishing} />
        ) : (
          <VisibilitySection values={values} set={set} />
        )}
      </div>

      <div className="border-line bg-sand-50/90 sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-end gap-4 border-t px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="min-w-0 flex-1 text-xs sm:text-sm">
          {dirty && !uploads.uploading && <p className="text-muted">{t("unsaved")}</p>}
          {/* One live region: upload progress wins over the saved state. */}
          <p
            role="status"
            className={cn(
              uploads.uploading
                ? "text-muted"
                : "text-leaf inline-flex items-center gap-2 font-medium",
            )}
          >
            {uploads.uploading
              ? tm("waitForUploads")
              : !dirty &&
                saved && (
                  <>
                    <CircleCheck className="size-4 shrink-0" aria-hidden />
                    {saved === "saved" ? t("saved") : t("unchanged")}
                  </>
                )}
          </p>
        </div>
        <Button type="submit" size="lg" loading={pending} disabled={uploads.uploading}>
          {!pending && <Save aria-hidden />}
          {mode === "edit" ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
