"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Link } from "@/i18n/navigation";
import { signInAction } from "../actions";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signInAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  // Dispatch manually so React does not reset the form (keeps input after an error).
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && <Alert>{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}

      <Field label={t("fields.email")} htmlFor="email" error={errors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.emailPlaceholder")}
          required
          aria-invalid={Boolean(errors?.email)}
          aria-describedby={errors?.email ? "email-error" : undefined}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Field label={t("fields.password")} htmlFor="password" error={errors?.password?.[0]}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors?.password)}
            aria-describedby={errors?.password ? "password-error" : undefined}
          />
        </Field>
        <Link
          href="/forgot-password"
          className="self-end text-sm font-medium text-terracotta hover:underline"
        >
          {t("login.forgotLink")}
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t("login.submit")}
        {!pending && <ArrowRight aria-hidden />}
      </Button>
    </form>
  );
}
