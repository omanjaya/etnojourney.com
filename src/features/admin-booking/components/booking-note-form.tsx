"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { addBookingNoteAction } from "../actions";
import { NOTE_MAX_LENGTH } from "../schemas";

/** Adds an internal note; the page re-renders with the new note via revalidation. */
export function BookingNoteForm({ bookingId }: { bookingId: number }) {
  const t = useTranslations("adminBooking.notes");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addBookingNoteAction({ bookingId, body });
      if (result.ok) {
        setBody("");
      } else {
        setError(result.fieldErrors?.body?.[0] ?? result.error);
      }
    });
  };

  const remaining = NOTE_MAX_LENGTH - body.length;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label={t("label")} htmlFor="booking-note" error={error ?? undefined}>
        <Textarea
          id="booking-note"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          required
          rows={3}
          placeholder={t("placeholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "booking-note-error" : "booking-note-count"}
          className="short:min-h-20 min-h-24"
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p id="booking-note-count" className="text-muted text-xs tabular-nums">
          {t("remaining", { count: remaining })}
        </p>
        <Button
          type="submit"
          size="sm"
          variant="dark"
          loading={pending}
          disabled={body.trim().length === 0}
        >
          <Send aria-hidden />
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
