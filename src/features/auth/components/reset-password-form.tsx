"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import { resetPasswordAction } from "../actions";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && <Alert>{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />

      <Field label={t("reset.newPassword")} htmlFor="password" error={errors?.password?.[0]}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder={t("fields.passwordPlaceholder")}
          required
          minLength={8}
          aria-invalid={Boolean(errors?.password)}
          aria-describedby={errors?.password ? "password-error" : undefined}
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
          aria-invalid={Boolean(errors?.confirmPassword)}
          aria-describedby={errors?.confirmPassword ? "confirmPassword-error" : undefined}
        />
      </Field>

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t("reset.submit")}
        {!pending && <KeyRound aria-hidden />}
      </Button>
    </form>
  );
}
