"use client";

import { Landmark, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { recordRefundAction } from "../actions";

/**
 * "Record refund" button plus a modal form for the bank/Midtrans reference.
 * The refund itself happens outside the app; this only records it.
 */
export function RecordRefundDialog({
  paymentId,
  code,
  amountLabel,
}: {
  paymentId: number;
  code: string;
  /** Pre-formatted amount, e.g. "Rp 1.400.000". */
  amountLabel: string;
}) {
  const t = useTranslations("adminPayments.refund");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const noteId = `${id}-note`;
  const titleId = `${id}-title`;
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const close = () => dialogRef.current?.close();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);
    startTransition(async () => {
      const result = await recordRefundAction(paymentId, note);
      if (result.ok) {
        setNote("");
        close();
        return;
      }
      const noteError = result.fieldErrors?.note?.[0];
      if (noteError) setFieldError(noteError);
      else setError(result.error);
    });
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size="sm"
        variant="dark"
        className="h-10 md:h-9"
        aria-label={t("triggerFor", { code })}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Undo2 aria-hidden />
        {t("trigger")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current && !pending) close();
        }}
        className="bg-sand-50 text-ink m-auto w-[calc(100%-2rem)] max-w-lg rounded-(--radius-card) p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={submit} className="short:p-6 p-6 md:p-8" noValidate>
          <span className="bg-sand-100 text-terracotta short:size-10 grid size-12 place-items-center rounded-full">
            <Landmark className="size-5" aria-hidden />
          </span>
          <h2 id={titleId} className="short:mt-3 mt-5 text-2xl">
            {t("title")} <span className="font-mono text-base">{code}</span>
          </h2>
          <p className="text-ink-soft mt-2 text-sm">{t("body", { amount: amountLabel })}</p>

          <Field
            className="short:mt-4 mt-6"
            label={t("noteLabel")}
            htmlFor={noteId}
            hint={t("noteHint")}
            error={fieldError}
          >
            <Textarea
              id={noteId}
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={500}
              required
              rows={3}
              className="min-h-24"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${noteId}-error` : undefined}
            />
          </Field>

          {error && <Alert className="mt-4">{error}</Alert>}

          <div className="short:mt-6 mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {t("submit")}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
