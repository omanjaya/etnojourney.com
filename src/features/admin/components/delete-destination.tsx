"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteDestinationAction } from "../actions";

/**
 * Danger zone for the destination edit page. Disabled (with an explanation)
 * while tours still reference the destination; the server re-checks anyway.
 */
export function DeleteDestination({
  destinationId,
  name,
  tourCount,
}: {
  destinationId: number;
  name: string;
  tourCount: number;
}) {
  const t = useTranslations("admin.destinationForm.delete");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = tourCount > 0;

  const close = () => dialogRef.current?.close();

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await deleteDestinationAction(destinationId);
      // Success redirects on the server.
      if (!result.ok) {
        setError(result.error);
        close();
      }
    });

  return (
    <section
      aria-labelledby="delete-destination-title"
      className="border-danger/25 mt-10 rounded-(--radius-card) border bg-white p-6 md:p-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 id="delete-destination-title" className="text-2xl">
            {t("title")}
          </h2>
          <p className="text-muted mt-2 text-sm">
            {blocked ? t("blocked", { count: tourCount }) : t("hint")}
          </p>
        </div>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="border-danger/40 text-danger hover:bg-danger-light hover:border-danger shrink-0"
          disabled={blocked}
          aria-describedby="delete-destination-title"
          onClick={() => dialogRef.current?.showModal()}
        >
          <Trash2 aria-hidden />
          {t("trigger")}
        </Button>
      </div>
      {error && <Alert className="mt-5">{error}</Alert>}

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-destination-confirm"
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current && !pending) close();
        }}
        className="bg-sand-50 text-ink m-auto w-[calc(100%-2rem)] max-w-md rounded-(--radius-card) p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6 md:p-8">
          <span className="bg-danger-light text-danger grid size-12 place-items-center rounded-full">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <h3 id="delete-destination-confirm" className="mt-5 text-2xl">
            {t("confirmTitle", { name })}
          </h3>
          <p className="text-ink-soft mt-2 text-sm">{t("confirmBody")}</p>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending} autoFocus>
              {t("cancel")}
            </Button>
            <Button type="button" variant="danger" onClick={confirm} loading={pending}>
              {t("confirm")}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
