"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { DEPARTURE_NOTE_MAX_LENGTH } from "@/server/services/departure.rules";
import { saveDepartureNoteAction } from "../actions";

/** Operational note shared with the guide (meeting time, vehicle). Empty clears it. */
export function DepartureNoteForm({
  tourId,
  date,
  initialNote,
}: {
  tourId: number;
  date: string;
  initialNote: string | null;
}) {
  const t = useTranslations("adminDepartures.note");
  const [note, setNote] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveDepartureNoteAction({ tourId, date, note });
      if (result.ok) {
        setSaved(note.trim());
        setSuccess(true);
      } else {
        setError(result.fieldErrors?.note?.[0] ?? result.error);
      }
    });
  };

  const remaining = DEPARTURE_NOTE_MAX_LENGTH - note.length;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label={t("label")} htmlFor="departure-note" error={error ?? undefined}>
        <Textarea
          id="departure-note"
          name="note"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSuccess(false);
          }}
          maxLength={DEPARTURE_NOTE_MAX_LENGTH}
          rows={4}
          placeholder={t("placeholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "departure-note-error" : "departure-note-count"}
          className="short:min-h-20 min-h-24"
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p id="departure-note-count" className="text-muted text-xs tabular-nums">
          {t("remaining", { count: remaining })}
        </p>
        <Button
          type="submit"
          size="sm"
          variant="dark"
          loading={pending}
          disabled={note.trim() === saved}
        >
          <Save aria-hidden />
          {t("save")}
        </Button>
      </div>
      {success && <Alert tone="success">{t("saved")}</Alert>}
    </form>
  );
}
