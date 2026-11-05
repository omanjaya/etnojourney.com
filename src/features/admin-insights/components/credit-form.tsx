"use client";

import Image from "next/image";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { isUploadedImagePath } from "@/features/media/image-url";
import { createCreditAction, updateCreditAction } from "../actions";

export type CreditFormValues = {
  path: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  source: string;
};

export const emptyCredit: CreditFormValues = {
  path: "",
  title: "",
  author: "",
  license: "",
  licenseUrl: "",
  sourceUrl: "",
  source: "",
};

type TextKey = Exclude<keyof CreditFormValues, "path">;
const TEXT_FIELDS: { key: TextKey; type: "text" | "url"; required: boolean }[] = [
  { key: "title", type: "text", required: true },
  { key: "author", type: "text", required: true },
  { key: "license", type: "text", required: true },
  { key: "licenseUrl", type: "url", required: false },
  { key: "source", type: "text", required: true },
  // Own photos and local photographers often have no web page to link to.
  { key: "sourceUrl", type: "url", required: false },
];

/**
 * Edit an existing credit (path fixed) or add one for an uploaded image:
 * either a photo picked from the list (`pathLocked`) or a typed /media/ path.
 */
export function CreditForm({
  mode,
  defaults,
  pathLocked = false,
  onDone,
  onCancel = mode === "edit" ? onDone : undefined,
}: {
  mode: "create" | "edit";
  defaults: CreditFormValues;
  /** Create mode: the photo was picked from the list, so its path is not editable. */
  pathLocked?: boolean;
  onDone?: () => void;
  /** Shows a cancel button (edit mode: defaults to `onDone`). */
  onCancel?: () => void;
}) {
  const t = useTranslations("adminInsights.credits.form");
  const id = useId();
  const [values, setValues] = useState(defaults);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const fieldId = (key: string) => `${id}-${key}`;
  const err = (key: string) => fieldErrors[key]?.[0];
  const invalid = (key: string) =>
    err(key) ? { "aria-invalid": true as const, "aria-describedby": `${fieldId(key)}-error` } : {};

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const action = mode === "create" ? createCreditAction : updateCreditAction;
      const result = await action(values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setFieldErrors({});
      setSaved(true);
      if (mode === "create") setValues(emptyCredit);
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {mode === "create" && !pathLocked && (
        <div className="flex items-start gap-4">
          <Field
            label={t("path")}
            htmlFor={fieldId("path")}
            error={err("path")}
            hint={t("pathHint")}
            className="min-w-0 flex-1"
          >
            <Input
              id={fieldId("path")}
              value={values.path}
              onChange={(e) => setValues((v) => ({ ...v, path: e.target.value }))}
              placeholder="/media/tours/2026/05/....webp"
              required
              autoComplete="off"
              {...invalid("path")}
            />
          </Field>
          {isUploadedImagePath(values.path.trim()) && (
            <div className="bg-sand-200 relative mt-7 size-16 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={values.path.trim()}
                alt={t("preview")}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}
      {pathLocked && err("path") && (
        <p role="alert" className="text-danger text-xs">
          {err("path")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map(({ key, type, required }) => (
          <Field
            key={key}
            label={required ? t(key) : t("optional", { label: t(key) })}
            htmlFor={fieldId(key)}
            error={err(key)}
          >
            <Input
              id={fieldId(key)}
              type={type}
              inputMode={type === "url" ? "url" : undefined}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={type === "url" ? "https://" : undefined}
              required={required}
              {...invalid(key)}
            />
          </Field>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}
      {saved && mode === "create" && <Alert tone="success">{t("created")}</Alert>}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" variant="dark" size="sm" disabled={pending}>
          <Save aria-hidden />
          {mode === "create" ? t("create") : t("save")}
        </Button>
      </div>
    </form>
  );
}
