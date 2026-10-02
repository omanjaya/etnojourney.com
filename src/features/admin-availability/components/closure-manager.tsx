"use client";

import { Lock, TriangleAlert, Unlock, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mondayIndex, type AdminDay } from "@/server/services/availability.rules";
import {
  closeDatesAction,
  previewClosureAction,
  reopenClosuresAction,
  type ClosurePreview,
} from "../actions";

type Selection = { from: string; to: string } | null;

type PreviewState = {
  key: string;
  data?: ClosurePreview;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Hatching for closed dates (same idea as the public calendar). */
const HATCH =
  "bg-[repeating-linear-gradient(135deg,var(--color-sand-200)_0_4px,transparent_4px_8px)]";
const HATCH_ALL =
  "bg-[repeating-linear-gradient(135deg,var(--color-indigo)_0_1px,transparent_1px_6px)]";

/**
 * Back-office month grid plus the close/reopen panel. Clicking a date selects
 * it; clicking a later date extends the selection to a range. The range can
 * also be typed, which allows spanning months (up to 92 days).
 */
export function ClosureManager({
  days,
  today,
  tourId,
  tourName,
}: {
  days: AdminDay[];
  today: string;
  /** Selected tour, or null for all tours. */
  tourId: number | null;
  /** Localized tour title, or null for all tours. */
  tourName: string | null;
}) {
  const t = useTranslations("adminAvailability");
  const locale = useLocale();
  const hintId = useId();
  const [selection, setSelection] = useState<Selection>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const key = selection ? `${tourId ?? "all"}:${selection.from}:${selection.to}` : "";
  const current = preview?.key === key ? preview : null;
  const checking = Boolean(selection) && !current;

  // Ask the server what closing the selection would do whenever it changes.
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    const requestKey = `${tourId ?? "all"}:${selection.from}:${selection.to}`;
    previewClosureAction({ tourId, from: selection.from, to: selection.to })
      .then((result) => {
        if (cancelled) return;
        setPreview(
          result.ok
            ? { key: requestKey, data: result.data }
            : { key: requestKey, error: result.error, fieldErrors: result.fieldErrors },
        );
      })
      .catch(() => {
        if (!cancelled) setPreview({ key: requestKey, error: t("panel.loadError") });
      });
    return () => {
      cancelled = true;
    };
  }, [selection, tourId, t]);

  const short = (date: string) =>
    formatDate(date, locale, { day: "numeric", month: "short", year: "numeric" });
  const rangeLabel = (from: string, to: string) =>
    from === to ? short(from) : t("rangeLabel", { from: short(from), to: short(to) });

  const pick = (date: string) => {
    setNotice(null);
    setSelection((prev) => {
      if (prev && prev.from === prev.to && date > prev.from) return { from: prev.from, to: date };
      return { from: date, to: date };
    });
  };

  const setBound = (bound: "from" | "to", value: string) => {
    setNotice(null);
    if (!value) return setSelection(null);
    setSelection((prev) => {
      const base = prev ?? { from: value, to: value };
      const next = { ...base, [bound]: value };
      // Typing a start after the end moves the end along.
      if (bound === "from" && next.to < value) next.to = value;
      return next;
    });
  };

  const clear = () => {
    setSelection(null);
    setReason("");
  };

  const close = () => {
    if (!selection) return;
    startTransition(async () => {
      const result = await closeDatesAction({ tourId, ...selection, reason });
      if (!result.ok) {
        setNotice({ tone: "danger", text: result.error });
        return;
      }
      const parts = [t("panel.success", { count: result.data.created })];
      if (result.data.affectedBookings > 0) {
        parts.push(t("panel.successAffected", { count: result.data.affectedBookings }));
      }
      setNotice({ tone: "success", text: parts.join(" ") });
      clear();
    });
  };

  const reopen = (id: number) => {
    startTransition(async () => {
      const result = await reopenClosuresAction([id]);
      setNotice(
        result.ok
          ? { tone: "success", text: t("panel.reopened", { count: result.data.removed }) }
          : { tone: "danger", text: result.error },
      );
      if (result.ok) clear();
    });
  };

  const inSelection = (date: string) =>
    Boolean(selection && date >= selection.from && date <= selection.to);
  const selectedDay =
    selection && selection.from === selection.to
      ? days.find((d) => d.date === selection.from)
      : undefined;

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(2024, 0, 1 + i)); // 2024-01-01 is a Monday.
    const fmt = (weekday: "short" | "long") =>
      new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" }).format(date);
    return { short: fmt("short"), long: fmt("long") };
  });
  const leading = days.length ? mondayIndex(days[0].date) : 0;

  const dayLabel = (day: AdminDay) => {
    const parts = [
      formatDate(day.date, locale, { weekday: "long", day: "numeric", month: "long" }),
    ];
    if (day.capacity !== null) {
      parts.push(t("day.seatsOf", { seats: day.seats, capacity: day.capacity }));
    }
    parts.push(t("day.bookings", { count: day.bookings, seats: day.seats }));
    if (day.closure) parts.push(tourId === null ? t("day.closedAll") : t("day.closed"));
    if (day.closedForAll) parts.push(t("day.closedAll"));
    if (day.toursClosed > 0) parts.push(t("day.toursClosed", { count: day.toursClosed }));
    if (day.past) parts.push(t("day.past"));
    return parts.join(", ");
  };

  const fromError = current?.fieldErrors?.from?.[0];
  const toError = current?.fieldErrors?.to?.[0];
  const data = current?.data;

  return (
    <div className="short:gap-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="border-line short:p-3 rounded-(--radius-card) border bg-white p-3 sm:p-5">
        <p id={hintId} className="text-muted short:mb-2 mb-3 text-xs">
          {t("calendar.hint")}
        </p>
        <div role="group" aria-describedby={hintId} className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekdays.map((weekday) => (
            <abbr
              key={weekday.long}
              title={weekday.long}
              className="text-muted pb-1 text-center text-[11px] font-medium tracking-wide uppercase no-underline"
            >
              {weekday.short}
            </abbr>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden />
          ))}
          {days.map((day) => {
            const selected = inSelection(day.date);
            const closed = Boolean(day.closure);
            const full = day.capacity !== null && day.seats >= day.capacity && day.capacity > 0;
            return (
              <button
                key={day.date}
                type="button"
                data-date={day.date}
                data-closed={closed || day.closedForAll || undefined}
                disabled={day.past}
                aria-pressed={selected}
                aria-label={dayLabel(day)}
                onClick={() => pick(day.date)}
                className={cn(
                  "border-line short:h-14 relative flex h-16 flex-col items-start justify-between overflow-hidden rounded-lg border p-1.5 text-left transition-colors sm:h-20 sm:p-2",
                  "hover:border-sand-300 disabled:cursor-not-allowed disabled:opacity-45",
                  closed && cn(HATCH, "border-sand-300"),
                  !closed && day.closedForAll && HATCH_ALL,
                  selected && "border-terracotta ring-terracotta/30 ring-2",
                )}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {Number(day.date.slice(8))}
                  </span>
                  {(closed || day.closedForAll) && (
                    <Lock
                      aria-hidden
                      className={cn("size-3.5", closed ? "text-ink" : "text-indigo")}
                    />
                  )}
                </span>
                <span aria-hidden className="w-full text-[10px] leading-tight sm:text-[11px]">
                  {closed ? (
                    <span className="block truncate font-semibold uppercase">
                      {tourId === null ? t("calendar.closedAll") : t("calendar.closed")}
                    </span>
                  ) : day.closedForAll ? (
                    <span className="text-indigo block truncate font-semibold uppercase">
                      {t("calendar.closedAll")}
                    </span>
                  ) : day.toursClosed > 0 ? (
                    <span className="text-ink-soft block truncate">
                      {t("calendar.toursClosed", { count: day.toursClosed })}
                    </span>
                  ) : null}
                  {day.capacity !== null ? (
                    <span
                      className={cn(
                        "block tabular-nums",
                        full ? "text-danger font-semibold" : "text-muted",
                        closed && day.bookings > 0 && "text-terracotta font-semibold",
                      )}
                    >
                      {t("calendar.seats", { seats: day.seats, capacity: day.capacity })}
                    </span>
                  ) : day.seats > 0 ? (
                    <span
                      className={cn(
                        "block truncate tabular-nums",
                        closed ? "text-terracotta font-semibold" : "text-muted",
                      )}
                    >
                      {t("calendar.travellers", { count: day.seats })}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <ul
          aria-hidden
          className="border-line text-muted short:mt-3 short:pt-2 mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-[11px]"
        >
          <li className="flex items-center gap-1.5">
            <span className="border-line size-3 rounded-sm border bg-white" />
            {t("legend.open")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className={cn("border-sand-300 size-3 rounded-sm border", HATCH)} />
            {t("legend.closed")}
          </li>
          {tourId !== null && (
            <li className="flex items-center gap-1.5">
              <span className={cn("border-line size-3 rounded-sm border", HATCH_ALL)} />
              {t("legend.closedAll")}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="border-terracotta ring-terracotta/30 size-3 rounded-sm border ring-2" />
            {t("legend.selected")}
          </li>
          {tourId !== null && (
            <li className="flex items-center gap-1.5">
              <span className="text-danger font-semibold">{t("legend.fullSample")}</span>
              {t("legend.full")}
            </li>
          )}
        </ul>
      </div>

      <section
        aria-labelledby="closure-panel-title"
        className="border-line short:p-4 self-start rounded-(--radius-card) border bg-white p-5 lg:sticky lg:top-6"
      >
        <h2 id="closure-panel-title" className="font-display short:text-lg text-xl">
          {t("panel.title")}
        </h2>
        <p className="text-muted mt-1 text-sm">
          {tourName ? t("panel.scopeTour", { tour: tourName }) : t("panel.scopeAll")}
        </p>

        {notice && (
          <Alert tone={notice.tone} className="short:mt-3 mt-4">
            {notice.text}
          </Alert>
        )}

        <div className="short:mt-3 short:gap-3 mt-4 grid grid-cols-2 gap-3">
          <Field label={t("panel.from")} htmlFor="closure-from" error={fromError}>
            <Input
              id="closure-from"
              type="date"
              min={today}
              value={selection?.from ?? ""}
              onChange={(event) => setBound("from", event.target.value)}
              aria-invalid={Boolean(fromError) || undefined}
              aria-describedby={fromError ? "closure-from-error" : undefined}
              className="short:h-10 h-11 px-3"
            />
          </Field>
          <Field label={t("panel.to")} htmlFor="closure-to" error={toError}>
            <Input
              id="closure-to"
              type="date"
              min={selection?.from ?? today}
              value={selection?.to ?? ""}
              onChange={(event) => setBound("to", event.target.value)}
              aria-invalid={Boolean(toError) || undefined}
              aria-describedby={toError ? "closure-to-error" : undefined}
              className="short:h-10 h-11 px-3"
            />
          </Field>
        </div>

        <div aria-live="polite" className="short:mt-3 mt-4 flex flex-col gap-3 text-sm">
          {!selection ? (
            <p className="text-muted">{t("panel.empty")}</p>
          ) : checking ? (
            <p className="text-muted">{t("panel.checking")}</p>
          ) : current?.error && !fromError && !toError ? (
            <Alert>{current.error}</Alert>
          ) : data ? (
            <>
              <p>
                {t("panel.summary", {
                  count: data.days,
                  range: rangeLabel(selection.from, selection.to),
                })}
                {data.alreadyClosed > 0 && (
                  <> {t("panel.alreadyClosed", { count: data.alreadyClosed })}</>
                )}
              </p>
              {data.affected.bookings > 0 && (
                <div
                  role="status"
                  className="bg-gold-light flex items-start gap-3 rounded-xl px-4 py-3 text-[#6f4f17]"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>
                    {t("panel.affected", {
                      bookings: data.affected.bookings,
                      seats: data.affected.seats,
                    })}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {selectedDay?.closure && (
          <div className="bg-sand-50 border-line short:mt-3 mt-4 rounded-xl border p-3 text-sm">
            <p className="font-medium">
              {t("panel.closedNotice", { date: short(selectedDay.date) })}
            </p>
            {selectedDay.closure.reason && (
              <p className="text-ink-soft mt-1">
                {t("panel.closedReason", { reason: selectedDay.closure.reason })}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              loading={pending}
              onClick={() => reopen(selectedDay.closure!.id)}
            >
              <Unlock aria-hidden />
              {t("panel.reopen", { date: short(selectedDay.date) })}
            </Button>
          </div>
        )}
        {selectedDay?.closedForAll && (
          <p className="text-ink-soft bg-sand-50 short:mt-3 mt-4 rounded-xl p-3 text-sm">
            {t("panel.closedAllNotice")}
          </p>
        )}

        {selection && data && data.newDays > 0 && (
          <div className="short:mt-3 short:gap-3 mt-4 flex flex-col gap-4">
            <Field
              label={t("panel.reason")}
              htmlFor="closure-reason"
              hint={t("panel.reasonHint", { count: reason.length })}
            >
              <Textarea
                id="closure-reason"
                maxLength={200}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("panel.reasonPlaceholder")}
                className="short:min-h-16 min-h-20"
              />
            </Field>
            <Button type="button" variant="dark" loading={pending} onClick={close}>
              <Lock aria-hidden />
              {t("panel.submit", { count: data.newDays })}
            </Button>
          </div>
        )}
        {selection && data && data.newDays === 0 && !selectedDay?.closure && (
          <p className="text-muted mt-3 text-sm">{t("panel.allClosed")}</p>
        )}

        {selection && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 -ml-2"
            onClick={() => {
              clear();
              setNotice(null);
            }}
          >
            <X aria-hidden />
            {t("panel.clear")}
          </Button>
        )}
      </section>
    </div>
  );
}
