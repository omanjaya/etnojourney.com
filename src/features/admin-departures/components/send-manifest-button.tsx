"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendManifestAction } from "../actions";

/** Emails the manifest to the assigned guide after a confirmation. */
export function SendManifestButton({
  tourId,
  date,
  email,
  disabledReason,
}: {
  tourId: number;
  date: string;
  email: string | null;
  /** Shown instead of sending when the manifest can't go out yet. */
  disabledReason: string | null;
}) {
  const t = useTranslations("adminDepartures.send");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!email || !window.confirm(t("confirm", { email }))) return;
    setMessage(null);
    startTransition(async () => {
      const result = await sendManifestAction({ tourId, date });
      setMessage(
        result.ok
          ? { tone: "success", text: t("sent", { email: result.data.email }) }
          : { tone: "danger", text: result.error },
      );
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        loading={pending}
        disabled={Boolean(disabledReason) || !email}
        onClick={send}
        aria-describedby={disabledReason ? "send-manifest-reason" : undefined}
      >
        <Send aria-hidden />
        {t("button")}
      </Button>
      {disabledReason && (
        <p id="send-manifest-reason" className="text-muted text-xs">
          {disabledReason}
        </p>
      )}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
