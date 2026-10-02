"use client";

import { Ban, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { setUserDisabledAction } from "../actions";

/** Disable / enable with a confirmation. Disabling signs the user out everywhere. */
export function UserAccessControl({
  userId,
  name,
  disabled,
}: {
  userId: string;
  name: string;
  disabled: boolean;
}) {
  const t = useTranslations("adminUsers.detail");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);

  const toggle = () => {
    const next = !disabled;
    if (!window.confirm(next ? t("confirmDisable", { name }) : t("confirmEnable", { name })))
      return;
    setMessage(null);
    startTransition(async () => {
      const result = await setUserDisabledAction(userId, next);
      setMessage(
        result.ok
          ? { tone: "success", text: t("statusSaved") }
          : { tone: "danger", text: result.error },
      );
    });
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        type="button"
        variant={disabled ? "dark" : "outline"}
        className={disabled ? undefined : "text-danger"}
        loading={pending}
        onClick={toggle}
      >
        {disabled ? <CircleCheck aria-hidden /> : <Ban aria-hidden />}
        {disabled ? t("enable") : t("disable")}
      </Button>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
