"use client";

import { Link2, Unlink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { linkGuideAccountAction, unlinkGuideAccountAction } from "../actions";

/**
 * Links or unlinks the guide's partner portal account (admins only). The
 * server re-checks the permission and every link rule.
 */
export function GuideAccountControl({
  guideId,
  account,
}: {
  guideId: number;
  account: { name: string; email: string } | null;
}) {
  const t = useTranslations("adminGuides.account");
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const link = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setFieldError(undefined);
    startTransition(async () => {
      const result = await linkGuideAccountAction(guideId, email);
      if (result.ok) {
        setEmail("");
        setMessage({ tone: "success", text: t("linked") });
      } else {
        setMessage({ tone: "danger", text: result.error });
        setFieldError(result.fieldErrors?.email?.[0]);
      }
    });
  };

  const unlink = () => {
    if (!account || !window.confirm(t("unlinkConfirm", { email: account.email }))) return;
    setMessage(null);
    startTransition(async () => {
      const result = await unlinkGuideAccountAction(guideId);
      setMessage(
        result.ok
          ? { tone: "success", text: t("unlinked") }
          : { tone: "danger", text: result.error },
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {account ? (
        <>
          <dl className="text-sm">
            <dt className="text-muted text-xs">{t("linkedTo")}</dt>
            <dd className="font-medium">{account.name}</dd>
            <dd className="text-ink-soft break-all">{account.email}</dd>
          </dl>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            loading={pending}
            onClick={unlink}
          >
            {!pending && <Unlink aria-hidden />}
            {t("unlink")}
          </Button>
        </>
      ) : (
        <form onSubmit={link} noValidate className="flex flex-col gap-3">
          <Field
            label={t("emailLabel")}
            htmlFor="partner-email"
            error={fieldError}
            hint={t("emailHint")}
          >
            <Input
              id="partner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              maxLength={254}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "partner-email-error" : undefined}
            />
          </Field>
          <Button type="submit" variant="dark" className="self-start" loading={pending}>
            {!pending && <Link2 aria-hidden />}
            {t("link")}
          </Button>
        </form>
      )}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
