"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { GUIDE_LANGUAGES } from "@/server/services/guide.rules";
import { CheckboxCard } from "@/features/admin/components/form-parts/checkbox-card";
import { Section } from "@/features/admin/components/form-parts/section";
import { createGuideAction, updateGuideAction } from "../actions";
import type { GuideFormValues } from "../schemas";

export type GuideFormDefaults = {
  name: string;
  organization: string;
  phone: string;
  email: string;
  languages: string[];
  destinationIds: number[];
  notes: string;
  isActive: boolean;
};

export const emptyGuideDefaults: GuideFormDefaults = {
  name: "",
  organization: "",
  phone: "",
  email: "",
  languages: ["id"],
  destinationIds: [],
  notes: "",
  isActive: true,
};

type DestinationOption = { id: number; name: string; province: string };

/** A group of toggle chips backed by real checkboxes (keyboard and screen reader friendly). */
function ChipGroup<T extends string | number>({
  legend,
  hint,
  name,
  options,
  selected,
  onChange,
  error,
}: {
  legend: string;
  hint?: string;
  name: string;
  options: { value: T; label: string; detail?: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
  error?: string;
}) {
  const toggle = (value: T, checked: boolean) =>
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="text-ink-soft mb-3 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "has-focus-visible:ring-terracotta/20 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors has-focus-visible:ring-4",
                checked
                  ? "border-terracotta bg-terracotta-light/50 text-ink"
                  : "border-line text-ink-soft hover:border-sand-300 bg-white",
              )}
            >
              <input
                id={id}
                type="checkbox"
                className="accent-terracotta size-4"
                checked={checked}
                onChange={(e) => toggle(option.value, e.target.checked)}
              />
              <span>{option.label}</span>
              {option.detail && <span className="text-muted text-xs">{option.detail}</span>}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${name}-error`} className="text-danger text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </fieldset>
  );
}

export function GuideForm({
  mode,
  guideId,
  defaults,
  destinations,
}: {
  mode: "create" | "edit";
  guideId?: number;
  defaults: GuideFormDefaults;
  destinations: DestinationOption[];
}) {
  const t = useTranslations("adminGuides.form");
  const tl = useTranslations("adminGuides.languages");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [values, setValues] = useState(defaults);

  const set = <K extends keyof GuideFormDefaults>(key: K, value: GuideFormDefaults[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldErrors[key]?.[0];
  const invalid = (key: string) =>
    err(key) ? { "aria-invalid": true as const, "aria-describedby": `${key}-error` } : {};

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});
    const payload = values as GuideFormValues;

    startTransition(async () => {
      const result =
        mode === "edit" && guideId
          ? await updateGuideAction(guideId, payload)
          : await createGuideAction(payload);
      // Creating redirects on the server, so only failures (or an edit) return here.
      if (result.ok) {
        setMessage({ tone: "success", text: t("saved") });
        return;
      }
      setMessage({ tone: "danger", text: result.error });
      setFieldErrors(result.fieldErrors ?? {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col">
      {message && (
        <Alert tone={message.tone} className="mb-8">
          {message.text}
        </Alert>
      )}

      <div className="border-line rounded-(--radius-card) border bg-white p-6 md:p-10">
        <Section title={t("sections.profile")} hint={t("sections.profileHint")}>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label={t("fields.name")} htmlFor="name" error={err("name")}>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="off"
                maxLength={120}
                {...invalid("name")}
              />
            </Field>
            <Field
              label={t("fields.organization")}
              htmlFor="organization"
              error={err("organization")}
              hint={t("fields.organizationHint")}
            >
              <Input
                id="organization"
                value={values.organization}
                onChange={(e) => set("organization", e.target.value)}
                autoComplete="off"
                maxLength={120}
                {...invalid("organization")}
              />
            </Field>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label={t("fields.phone")}
              htmlFor="phone"
              error={err("phone")}
              hint={t("fields.phoneHint")}
            >
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                autoComplete="off"
                maxLength={32}
                {...invalid("phone")}
              />
            </Field>
            <Field label={t("fields.email")} htmlFor="email" error={err("email")}>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="off"
                maxLength={254}
                {...invalid("email")}
              />
            </Field>
          </div>
        </Section>

        <Section title={t("sections.work")} hint={t("sections.workHint")}>
          <ChipGroup
            legend={t("fields.languages")}
            name="languages"
            options={GUIDE_LANGUAGES.map((code) => ({ value: code as string, label: tl(code) }))}
            selected={values.languages}
            onChange={(next) => set("languages", next)}
            error={err("languages")}
          />
          <ChipGroup
            legend={t("fields.destinations")}
            hint={destinations.length ? t("fields.destinationsHint") : t("fields.noDestinations")}
            name="destinationIds"
            options={destinations.map((d) => ({ value: d.id, label: d.name, detail: d.province }))}
            selected={values.destinationIds}
            onChange={(next) => set("destinationIds", next)}
            error={err("destinationIds")}
          />
        </Section>

        <Section title={t("sections.internal")} hint={t("sections.internalHint")}>
          <Field
            label={t("fields.notes")}
            htmlFor="notes"
            error={err("notes")}
            hint={t("fields.notesHint")}
          >
            <Textarea
              id="notes"
              rows={4}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={2000}
              {...invalid("notes")}
            />
          </Field>
          <CheckboxCard
            id="isActive"
            label={t("fields.active")}
            hint={t("fields.activeHint")}
            checked={values.isActive}
            onChange={(checked) => set("isActive", checked)}
          />
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
