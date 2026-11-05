"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteCreditAction } from "../actions";

/**
 * Deletes the credit of an upload the site no longer shows, after an inline
 * confirmation. The server refuses credits still in use.
 */
export function DeleteCredit({ path, title }: { path: string; title: string }) {
  const t = useTranslations("adminInsights.credits.delete");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    flushSync(() => setConfirming(false));
    triggerRef.current?.focus();
  };

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await deleteCreditAction({ path });
      // On success the page revalidates and the row disappears.
      if (!result.ok) {
        flushSync(() => {
          setError(result.error);
          setConfirming(false);
        });
        triggerRef.current?.focus();
      }
    });

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div role="group" aria-label={t("confirm")} className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t("confirm")}</span>
          <Button type="button" variant="danger" size="sm" onClick={confirm} loading={pending} autoFocus>
            {t("yes")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted hover:text-danger"
          onClick={() => setConfirming(true)}
          aria-label={t("triggerFor", { title })}
        >
          <Trash2 aria-hidden />
          {t("trigger")}
        </Button>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
