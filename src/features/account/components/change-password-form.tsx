"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import { PasswordInput } from "@/features/auth/components/password-input";
import { changePasswordAction } from "../actions";

const fields = [
  { name: "currentPassword", autoComplete: "current-password" },
  { name: "newPassword", autoComplete: "new-password" },
  { name: "confirmPassword", autoComplete: "new-password" },
] as const;

/** `changed`: the action redirected back here after a successful change. */
export function ChangePasswordForm({ changed = false }: { changed?: boolean }) {
  const t = useTranslations("account.settings.password");
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  // Clear the fields after a successful change so passwords don't linger in the DOM.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
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
      {fields.map(({ name, autoComplete }) => (
        <Field key={name} label={t(name)} htmlFor={name} error={errors?.[name]?.[0]}>
          <PasswordInput
            id={name}
            name={name}
            autoComplete={autoComplete}
            required
            aria-invalid={errors?.[name] ? true : undefined}
            aria-describedby={errors?.[name] ? `${name}-error` : undefined}
          />
        </Field>
      ))}

      {state && !state.ok && !errors && <Alert>{state.error}</Alert>}
      {(state?.ok || (changed && !state)) && <Alert tone="success">{t("saved")}</Alert>}

      <div>
        <Button type="submit" variant="dark" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
