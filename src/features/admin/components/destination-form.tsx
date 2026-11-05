"use client";

import { CircleCheck, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy, Input } from "@/components/ui/form-controls";
import { ImageUploader } from "@/features/media/components/image-uploader";
import type { LocalizedText } from "@/lib/i18n-text";
import { createDestinationAction, updateDestinationAction } from "../actions";
import type { DestinationFormValues } from "../schemas";
import { BilingualField } from "./form-parts/bilingual-field";
import { Section } from "./form-parts/section";
import { slugify } from "./form-parts/slug";
import { useFocusError } from "./form-parts/use-focus-error";
import { useLeaveGuard } from "./form-parts/use-leave-guard";

export type DestinationFormDefaults = {
  slug: string;
  name: string;
  province: string;
  tagline: LocalizedText;
  description: LocalizedText;
  heroImage: string;
  /** Empty in both locales means "not set" (stored as null). */
  gettingThere: LocalizedText;
};

export const emptyDestinationDefaults: DestinationFormDefaults = {
  slug: "",
  name: "",
  province: "",
  tagline: { id: "", en: "" },
  description: { id: "", en: "" },
  heroImage: "",
  gettingThere: { id: "", en: "" },
};

/**
 * Create/edit form for a destination. Edit mode saves in place and sends back
 * the `version` it was opened with (a newer save by someone else is refused,
 * not overwritten). Leaving with unsaved changes asks first; a failed save
 * focuses the first field with an error.
 */
export function DestinationForm({
  mode,
  destinationId,
  defaults,
  version,
}: {
  mode: "create" | "edit";
  destinationId?: number;
  defaults: DestinationFormDefaults;
  /** Edit mode: the edit version of the destination as loaded. */
  version?: string;
}) {
  const t = useTranslations("admin.destinationForm");
  const tf = useTranslations("admin.form");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [failures, setFailures] = useState(0);
  const [savedVersion, setSavedVersion] = useState(version ?? "");
  const [saved, setSaved] = useState<"saved" | "unchanged" | null>(null);
  const [values, setValues] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const snapshot = JSON.stringify(values);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;
  useLeaveGuard(dirty && !pending, tf("unsavedConfirm"));
  useFocusError(formRef, failures);

  const set = <K extends keyof DestinationFormDefaults>(
    key: K,
    value: DestinationFormDefaults[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldErrors[key]?.[0];
  const invalid = (key: string) =>
    err(key) ? { "aria-invalid": true as const, "aria-describedby": `${key}-error` } : {};

  const setName = (name: string) =>
    setValues((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));

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
    setError(null);
    setFieldErrors({});
    setSaved(null);
    const payload: DestinationFormValues = values;
    const submitted = snapshot;

    startTransition(async () => {
      if (mode === "edit" && destinationId) {
        const result = await updateDestinationAction(destinationId, payload, savedVersion);
        if (!result.ok) return showFailure(result);
        setSavedVersion(result.data.version);
        setSavedSnapshot(submitted);
        setSaved(result.data.changed ? "saved" : "unchanged");
        return;
      }
      // Creating redirects to the new destination's edit page, so only failures return here.
      const result = await createDestinationAction(payload);
      if (!result.ok) showFailure(result);
    });
  };

  return (
    <form ref={formRef} method="post" onSubmit={submit} noValidate className="flex flex-col">
      {error && <Alert className="mb-8">{error}</Alert>}

      <div className="border-line rounded-(--radius-card) border bg-white p-6 md:p-10">
        <Section title={t("sections.basics")} hint={t("sections.basicsHint")}>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label={t("fields.name")} htmlFor="name" error={err("name")}>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                {...invalid("name")}
              />
            </Field>
            <Field label={t("fields.province")} htmlFor="province" error={err("province")}>
              <Input
                id="province"
                value={values.province}
                onChange={(e) => set("province", e.target.value)}
                autoComplete="off"
                {...invalid("province")}
              />
            </Field>
          </div>
          <Field
            label={t("fields.slug")}
            htmlFor="slug"
            error={err("slug")}
            hint={mode === "edit" ? t("fields.slugHintEdit") : t("fields.slugHint")}
          >
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className="font-mono"
              {...invalid("slug")}
            />
          </Field>
          <BilingualField
            name="tagline"
            label={t("fields.tagline")}
            value={values.tagline}
            onChange={(v) => set("tagline", v)}
            error={err("tagline")}
            hint={t("fields.taglineHint")}
          />
          <BilingualField
            name="description"
            label={t("fields.description")}
            value={values.description}
            onChange={(v) => set("description", v)}
            error={err("description")}
            hint={t("fields.descriptionHint")}
            multiline
            rows={9}
          />
        </Section>

        <Section title={t("sections.access")} hint={t("sections.accessHint")}>
          <BilingualField
            name="gettingThere"
            label={t("fields.gettingThere")}
            value={values.gettingThere}
            onChange={(v) => set("gettingThere", v)}
            error={err("gettingThere")}
            hint={t("fields.gettingThereHint")}
            multiline
            rows={4}
          />
        </Section>

        <Section title={t("sections.media")} hint={t("sections.mediaHint")}>
          <Field label={t("fields.heroImage")} htmlFor="heroImage" error={err("heroImage")}>
            <ImageUploader
              id="heroImage"
              value={values.heroImage}
              onChange={(url) => set("heroImage", url)}
              invalid={Boolean(err("heroImage"))}
              describedBy={fieldDescribedBy("heroImage", { error: err("heroImage") })}
            />
          </Field>
        </Section>
      </div>

      <div className="border-line bg-sand-50/90 sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-end gap-4 border-t px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="min-w-0 flex-1 text-xs sm:text-sm">
          {dirty && <p className="text-muted">{tf("unsaved")}</p>}
          <p role="status" className="text-leaf inline-flex items-center gap-2 font-medium">
            {!dirty && saved && (
              <>
                <CircleCheck className="size-4 shrink-0" aria-hidden />
                {saved === "saved" ? tf("saved") : tf("unchanged")}
              </>
            )}
          </p>
        </div>
        <Button type="submit" size="lg" loading={pending}>
          {!pending && <Save aria-hidden />}
          {mode === "edit" ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
