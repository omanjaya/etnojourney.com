"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { signUpAction } from "../actions";
import { PasswordInput } from "./password-input";

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signUpAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  // Dispatch manually so React does not reset the form (keeps input after an error).
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const invalid = (name: string) => ({
    "aria-invalid": Boolean(errors?.[name]),
    "aria-describedby": errors?.[name] ? `${name}-error` : undefined,
  });

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && <Alert>{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}

      <Field label={t("fields.name")} htmlFor="name" error={errors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder={t("fields.namePlaceholder")}
          required
          {...invalid("name")}
        />
      </Field>

      <Field label={t("fields.email")} htmlFor="email" error={errors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.emailPlaceholder")}
          required
          {...invalid("email")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.password")} htmlFor="password" error={errors?.password?.[0]}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder={t("fields.passwordPlaceholder")}
            minLength={8}
            required
            {...invalid("password")}
          />
        </Field>
        <Field
          label={t("fields.confirmPassword")}
          htmlFor="confirmPassword"
          error={errors?.confirmPassword?.[0]}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            {...invalid("confirmPassword")}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t("register.submit")}
        {!pending && <ArrowRight aria-hidden />}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted">{t("register.terms")}</p>
    </form>
  );
}
