"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ImageUploader, MultiImageUploader } from "@/features/media/components/image-uploader";
import { tourCategories } from "@/components/shared/category-icon";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import type { TourCategory } from "@/server/db/schema";
import { createTourAction, updateTourAction } from "../actions";
import type { TourFormValues } from "../schemas";

const LOCALES: Locale[] = ["id", "en"];
const emptyText = (): LocalizedText => ({ id: "", en: "" });

/** Editable shape: list fields are kept as raw multi-line text until submit. */
export type TourFormDefaults = {
  slug: string;
  destinationId: number | "";
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  category: TourCategory | "";
  durationDays: number | "";
  pricePerPerson: number | "";
  maxParticipants: number | "";
  meetingPoint: string;
  coverImage: string;
  gallery: string[];
  highlights: LocalizedText[];
  included: LocalizedText[];
  isPublished: boolean;
  isFeatured: boolean;
  itinerary: { title: LocalizedText; description: LocalizedText }[];
};

export const emptyTourDefaults: TourFormDefaults = {
  slug: "",
  destinationId: "",
  title: emptyText(),
  summary: emptyText(),
  description: emptyText(),
  category: "",
  durationDays: 1,
  pricePerPerson: "",
  maxParticipants: 10,
  meetingPoint: "",
  coverImage: "",
  gallery: [],
  highlights: [],
  included: [],
  isPublished: false,
  isFeatured: false,
  itinerary: [{ title: emptyText(), description: emptyText() }],
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Pairs ID and EN lines by index; mismatched counts surface as validation errors. */
function pairLines(text: LocalizedText): LocalizedText[] {
  const id = fromLines(text.id);
  const en = fromLines(text.en);
  return Array.from({ length: Math.max(id.length, en.length) }, (_, i) => ({
    id: id[i] ?? "",
    en: en[i] ?? "",
  }));
}

const splitPairs = (pairs: LocalizedText[]): LocalizedText => ({
  id: toLines(pairs.map((p) => p.id)),
  en: toLines(pairs.map((p) => p.en)),
});

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line grid gap-6 border-b py-10 first:pt-0 last:border-0 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h2 className="text-2xl">{title}</h2>
        {hint && <p className="text-muted mt-2 text-sm">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

function LangTag({ locale }: { locale: Locale }) {
  return (
    <span className="bg-sand-100 text-ink-soft rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider">
      {locale.toUpperCase()}
    </span>
  );
}

/** Two side-by-side controls (ID, EN) for one localized value. */
export function BilingualField({
  name,
  label,
  value,
  onChange,
  error,
  multiline = false,
  rows,
  hint,
}: {
  name: string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  error?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-ink-soft mb-2 text-sm font-medium">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {LOCALES.map((locale) => {
          const id = `${name}-${locale}`;
          const common = {
            id,
            value: value[locale],
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? `${name}-error` : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, [locale]: e.target.value }),
          };
          return (
            <div key={locale} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-muted inline-flex items-center gap-2 text-xs">
                <LangTag locale={locale} />
                <span className="sr-only">{label}</span>
              </label>
              {multiline ? <Textarea rows={rows} {...common} /> : <Input {...common} />}
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </fieldset>
  );
}

function CheckboxCard({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors",
        checked
          ? "border-terracotta bg-terracotta-light/40"
          : "border-line hover:border-sand-300 bg-white",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-terracotta mt-0.5 size-4"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted block text-xs">{hint}</span>
      </span>
    </label>
  );
}

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
  const tc = useTranslations("common.categories");
  const tm = useTranslations("media.form");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const [values, setValues] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [highlightsText, setHighlightsText] = useState(splitPairs(defaults.highlights));
  const [includedText, setIncludedText] = useState(splitPairs(defaults.included));

  const set = <K extends keyof TourFormDefaults>(key: K, value: TourFormDefaults[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const err = (key: string) => fieldErrors[key]?.[0];

  const setTitle = (title: LocalizedText) => {
    setValues((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugify(title.id),
    }));
  };

  const updateDay = (index: number, patch: Partial<TourFormDefaults["itinerary"][number]>) =>
    set(
      "itinerary",
      values.itinerary.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );

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

  const numberValue = (raw: string) => (raw === "" ? "" : Number(raw));

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

        <Section title={t("sections.details")} hint={t("sections.detailsHint")}>
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label={t("fields.destination")}
              htmlFor="destinationId"
              error={err("destinationId")}
            >
              <Select
                id="destinationId"
                value={values.destinationId}
                onChange={(e) => set("destinationId", numberValue(e.target.value))}
                aria-invalid={err("destinationId") ? true : undefined}
              >
                <option value="">{t("fields.selectDestination")}</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}, {d.province}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("fields.category")} htmlFor="category" error={err("category")}>
              <Select
                id="category"
                value={values.category}
                onChange={(e) => set("category", e.target.value as TourCategory | "")}
                aria-invalid={err("category") ? true : undefined}
              >
                <option value="">-</option>
                {tourCategories.map((c) => (
                  <option key={c} value={c}>
                    {tc(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Field
              label={t("fields.durationDays")}
              htmlFor="durationDays"
              error={err("durationDays")}
            >
              <Input
                id="durationDays"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={values.durationDays}
                onChange={(e) => set("durationDays", numberValue(e.target.value))}
                aria-invalid={err("durationDays") ? true : undefined}
              />
            </Field>
            <Field
              label={t("fields.pricePerPerson")}
              htmlFor="pricePerPerson"
              error={err("pricePerPerson")}
            >
              <Input
                id="pricePerPerson"
                type="number"
                inputMode="numeric"
                min={1}
                step={1000}
                value={values.pricePerPerson}
                onChange={(e) => set("pricePerPerson", numberValue(e.target.value))}
                aria-invalid={err("pricePerPerson") ? true : undefined}
              />
            </Field>
            <Field
              label={t("fields.maxParticipants")}
              htmlFor="maxParticipants"
              error={err("maxParticipants")}
            >
              <Input
                id="maxParticipants"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={values.maxParticipants}
                onChange={(e) => set("maxParticipants", numberValue(e.target.value))}
                aria-invalid={err("maxParticipants") ? true : undefined}
              />
            </Field>
          </div>
          <Field
            label={t("fields.meetingPoint")}
            htmlFor="meetingPoint"
            error={err("meetingPoint")}
          >
            <Input
              id="meetingPoint"
              value={values.meetingPoint}
              onChange={(e) => set("meetingPoint", e.target.value)}
              aria-invalid={err("meetingPoint") ? true : undefined}
            />
          </Field>
        </Section>

        <Section title={t("sections.media")} hint={tm("sectionHint")}>
          <Field label={t("fields.coverImage")} htmlFor="coverImage" error={err("coverImage")}>
            <ImageUploader
              id="coverImage"
              value={values.coverImage}
              onChange={(url) => set("coverImage", url)}
              invalid={Boolean(err("coverImage"))}
            />
          </Field>
          <Field
            label={t("fields.gallery")}
            htmlFor="gallery"
            error={err("gallery")}
            hint={tm("galleryHint")}
          >
            <MultiImageUploader
              id="gallery"
              value={values.gallery}
              onChange={(urls) => set("gallery", urls)}
            />
          </Field>
        </Section>

        <Section title={t("sections.lists")} hint={t("sections.listsHint")}>
          <BilingualField
            name="highlights"
            label={t("fields.highlights")}
            value={highlightsText}
            onChange={setHighlightsText}
            error={err("highlights")}
            multiline
            rows={5}
          />
          <BilingualField
            name="included"
            label={t("fields.included")}
            value={includedText}
            onChange={setIncludedText}
            error={err("included")}
            multiline
            rows={5}
          />
        </Section>

        <Section title={t("sections.itinerary")} hint={t("sections.itineraryHint")}>
          {err("itinerary") && (
            <p role="alert" className="text-danger text-xs">
              {err("itinerary")}
            </p>
          )}
          {values.itinerary.length === 0 && (
            <p className="border-line text-muted rounded-xl border border-dashed p-6 text-center text-sm">
              {t("itinerary.empty")}
            </p>
          )}
          <ol className="flex flex-col gap-5">
            {values.itinerary.map((day, index) => (
              <li key={index} className="border-line bg-sand-50 rounded-xl border p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="font-display text-lg">
                    {t("itinerary.day", { day: index + 1 })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted hover:text-danger size-9"
                    aria-label={t("itinerary.remove", { day: index + 1 })}
                    onClick={() =>
                      set(
                        "itinerary",
                        values.itinerary.filter((_, i) => i !== index),
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
                set("itinerary", [
                  ...values.itinerary,
                  { title: emptyText(), description: emptyText() },
                ])
              }
            >
              <Plus aria-hidden />
              {t("itinerary.add")}
            </Button>
          </div>
        </Section>

        <Section title={t("sections.visibility")}>
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxCard
              id="isPublished"
              label={t("fields.isPublished")}
              hint={t("fields.isPublishedHint")}
              checked={values.isPublished}
              onChange={(v) => set("isPublished", v)}
            />
            <CheckboxCard
              id="isFeatured"
              label={t("fields.isFeatured")}
              hint={t("fields.isFeaturedHint")}
              checked={values.isFeatured}
              onChange={(v) => set("isFeatured", v)}
            />
          </div>
        </Section>
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
