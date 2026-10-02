"use client";

import { CalendarSync } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { DayAvailability } from "@/server/services/availability.rules";
import { AvailabilityCalendar } from "@/features/availability/components/availability-calendar";
import { rescheduleBookingAction } from "../actions";

const longDate = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;

/**
 * "Change date": a modal with the same availability calendar as the tour
 * page. A date is only offered when it has seats for everyone in the
 * booking; the server re-checks lead time, closures and seats under a lock.
 */
export function RescheduleDialog({
  bookingId,
  code,
  tourId,
  currentDate,
  participants,
  participantsLabel,
  maxReschedules,
  closesDaysBefore,
}: {
  bookingId: number;
  code: string;
  tourId: number;
  currentDate: string;
  participants: number;
  /** Pre-formatted, e.g. "2 orang". */
  participantsLabel: string;
  maxReschedules: number;
  closesDaysBefore: number;
}) {
  const t = useTranslations("selfService.reschedule");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const labelId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<DayAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A refused move (date just filled up or closed) refetches the calendar.
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const sameDate = day?.date === currentDate;
  const tooFewSeats = Boolean(day && !sameDate && day.seatsLeft < participants);
  const canSubmit = Boolean(day) && !sameDate && !tooFewSeats;

  const close = () => dialogRef.current?.close();

  const submit = () => {
    if (!day || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBookingAction(bookingId, day.date);
      if (result.ok) {
        close();
        return;
      }
      setError(result.error);
      setDay(null);
      setRefreshKey((key) => key + 1);
    });
  };

  const hint = !day
    ? t("noneSelected")
    : sameDate
      ? t("sameDate")
      : tooFewSeats
        ? t("notEnoughSeats", { count: day.seatsLeft, participants: participantsLabel })
        : t("selected", { date: formatDate(day.date, locale, longDate) });

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-label={t("triggerFor", { code })}
        onClick={() => {
          setError(null);
          setDay(null);
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        <CalendarSync aria-hidden />
        {t("trigger")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !pending) close();
        }}
        className="bg-sand-50 text-ink m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-(--radius-card) p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="short:p-5 p-6 md:p-7">
          <h2 id={titleId} className="short:text-xl text-2xl">
            {t("title")}
          </h2>
          <p className="text-ink-soft short:mt-1 mt-2 text-sm">
            {t("body", { max: maxReschedules, days: closesDaysBefore })}
          </p>
          <p className="text-muted mt-1 text-xs">
            {t("current", { date: formatDate(currentDate, locale, longDate) })}
          </p>

          <fieldset className="short:mt-3 mt-5 flex flex-col gap-2">
            <legend id={labelId} className="text-ink-soft mb-2 text-sm font-medium">
              {t("calendarLabel")}
            </legend>
            {open && (
              <AvailabilityCalendar
                tourId={tourId}
                value={day?.date ?? null}
                onChange={setDay}
                refreshKey={refreshKey}
                labelledBy={labelId}
                marked={{ date: currentDate, label: t("currentMarker") }}
                invalid={sameDate || tooFewSeats}
                describedBy={hintId}
              />
            )}
            <p
              id={hintId}
              className={sameDate || tooFewSeats ? "text-danger text-xs" : "text-muted text-xs"}
              aria-live="polite"
            >
              {hint}
            </p>
          </fieldset>

          {error && <Alert className="mt-4">{error}</Alert>}

          <div className="short:mt-4 mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              {t("keep")}
            </Button>
            <Button type="button" onClick={submit} loading={pending} disabled={!canSubmit}>
              {t("confirm")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
