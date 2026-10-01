"use client";

import { MailCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  const [dismissedState, setDismissedState] = useState<typeof state>(null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const sent = state?.ok && state !== dismissedState;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  if (sent) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-white p-6" role="status">
        <span className="grid size-12 place-items-center rounded-full bg-leaf-light text-leaf">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl">{t("forgot.sentTitle")}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{t("forgot.sent")}</p>
        <p className="mt-3 text-sm text-muted">{t("forgot.sentHint")}</p>
        <Button variant="outline" className="mt-6" onClick={() => setDismissedState(state)}>
          {t("forgot.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && <Alert>{state.error}</Alert>}
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
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t("forgot.submit")}
        {!pending && <Send aria-hidden />}
      </Button>
    </form>
  );
}
