"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { ImageUploader } from "@/features/media/components/image-uploader";
import type { LocalizedText } from "@/lib/i18n-text";
import { createDestinationAction, updateDestinationAction } from "../actions";
import type { DestinationFormValues } from "../schemas";
import { BilingualField } from "./form-parts/bilingual-field";
import { Section } from "./form-parts/section";
import { slugify } from "./form-parts/slug";

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

export function DestinationForm({
  mode,
  destinationId,
  defaults,
}: {
  mode: "create" | "edit";
  destinationId?: number;
  defaults: DestinationFormDefaults;
}) {
  const t = useTranslations("admin.destinationForm");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [values, setValues] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof DestinationFormDefaults>(
    key: K,
    value: DestinationFormDefaults[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldErrors[key]?.[0];
  const invalid = (key: string) =>
    err(key) ? { "aria-invalid": true as const, "aria-describedby": `${key}-error` } : {};

  const setName = (name: string) =>
    setValues((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const payload: DestinationFormValues = values;

    startTransition(async () => {
      const result =
        mode === "edit" && destinationId
          ? await updateDestinationAction(destinationId, payload)
          : await createDestinationAction(payload);
      // Success redirects on the server, so only failures return here.
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col">
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
            />
          </Field>
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
