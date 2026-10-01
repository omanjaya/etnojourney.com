"use client";

import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { updateProfileAction } from "../actions";

export function ProfileForm({
  name,
  email,
  locale,
}: {
  name: string;
  email: string;
  locale: Locale;
}) {
  const t = useTranslations("account.settings.profile");
  const tl = useTranslations("common.locale");
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form
      method="post"
      // Dispatch manually: a form `action` would reset typed values even on errors.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label={t("email")} htmlFor="email" hint={t("emailHint")}>
        <Input id="email" value={email} readOnly disabled autoComplete="email" />
      </Field>
      <Field label={t("name")} htmlFor="name" error={errors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? "name-error" : undefined}
        />
      </Field>
      <Field
        label={t("language")}
        htmlFor="locale"
        hint={t("languageHint")}
        error={errors?.locale?.[0]}
      >
        <Select id="locale" name="locale" defaultValue={locale}>
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {tl(l)}
            </option>
          ))}
        </Select>
      </Field>

      {state && !state.ok && !errors && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{t("saved")}</Alert>}

      <div>
        <Button type="submit" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
