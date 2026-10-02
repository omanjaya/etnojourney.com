"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { formatDate, isoDateFromToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  daysInMonth,
  isSelectable,
  MAX_MONTHS_AHEAD,
  mondayIndex,
  monthOf,
  type DayAvailability,
  type MonthAvailability,
} from "@/server/services/availability.rules";
import { MIN_LEAD_DAYS } from "@/server/services/booking.rules";
import { getAvailabilityAction } from "../actions";

type Store = {
  /** Identity of the `refreshKey` the cache belongs to. */
  key: unknown;
  months: Record<string, MonthAvailability>;
  failed: Record<string, true>;
};

const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/**
 * Month calendar showing seats left per date (WAI-ARIA grid pattern: one tab
 * stop, arrow keys move between days, Page Up/Down change month).
 *
 * Availability is advisory: the server re-checks capacity when booking.
 * Change `refreshKey` (any new identity) to drop cached months and refetch,
 * e.g. after a booking failed because a date just filled up.
 */
export function AvailabilityCalendar({
  tourId,
  value,
  onChange,
  refreshKey,
  labelledBy,
  invalid = false,
  describedBy,
}: {
  tourId: number;
  value: string | null;
  /** Called with the chosen day, or `null` when a refresh made it unbookable. */
  onChange: (day: DayAvailability | null) => void;
  refreshKey?: unknown;
  labelledBy: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const t = useTranslations("booking.calendar");
  const locale = useLocale();
  const hintId = useId();
  const monthLabelId = useId();

  const [today] = useState(() => isoDateFromToday(0));
  const minMonth = monthOf(today);
  const maxMonth = addMonths(minMonth, MAX_MONTHS_AHEAD);

  const [month, setMonth] = useState(() => monthOf(value ?? addDays(today, MIN_LEAD_DAYS)));
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [store, setStore] = useState<Store>({ key: refreshKey, months: {}, failed: {} });

  // A new refreshKey invalidates everything fetched so far (render-time reset).
  if (store.key !== refreshKey) setStore({ key: refreshKey, months: {}, failed: {} });

  const data = store.months[month];
  const failed = Boolean(store.failed[month]);

  // Latest selection callbacks for the async fetch below, without refetching on change.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (data || failed) return;
    let cancelled = false;
    getAvailabilityAction(tourId, month)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setStore((s) => ({ ...s, failed: { ...s.failed, [month]: true } }));
          return;
        }
        setStore((s) => ({ ...s, months: { ...s.months, [month]: result.data } }));
        // Keep the selection in sync with fresh numbers (seats may have changed).
        const selected = valueRef.current;
        if (selected && monthOf(selected) === month) {
          const day = result.data.days.find((d) => d.date === selected);
          onChangeRef.current(day && isSelectable(day.state) ? day : null);
        }
      })
      .catch(() => {
        if (!cancelled) setStore((s) => ({ ...s, failed: { ...s.failed, [month]: true } }));
      });
    return () => {
      cancelled = true;
    };
  }, [tourId, month, data, failed]);

  const days = data?.days ?? [];
  const firstSelectable = days.find((d) => isSelectable(d.state))?.date;
  const activeDate =
    focusDate && monthOf(focusDate) === month
      ? focusDate
      : value && monthOf(value) === month
        ? value
        : (firstSelectable ?? `${month}-01`);

  // Move DOM focus after keyboard navigation re-renders (possibly a new month).
  const gridRef = useRef<HTMLTableElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current || !data) return;
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${activeDate}"]`);
    if (button) {
      button.focus();
      focusPending.current = false;
    }
  }, [activeDate, data]);

  const goToMonth = (next: string) => {
    if (next < minMonth || next > maxMonth) return;
    setMonth(next);
    setFocusDate(null);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    let next: string | null = null;
    if (event.key in ARROW_STEPS) next = addDays(activeDate, ARROW_STEPS[event.key]);
    else if (event.key === "Home") next = addDays(activeDate, -mondayIndex(activeDate));
    else if (event.key === "End") next = addDays(activeDate, 6 - mondayIndex(activeDate));
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const target = addMonths(month, event.key === "PageUp" ? -1 : 1);
      const day = Math.min(Number(activeDate.slice(8)), daysInMonth(target).length);
      next = `${target}-${String(day).padStart(2, "0")}`;
    }
    if (!next) return;
    event.preventDefault();
    const nextMonth = monthOf(next);
    if (nextMonth < minMonth || nextMonth > maxMonth) return;
    focusPending.current = true;
    setFocusDate(next);
    if (nextMonth !== month) setMonth(nextMonth);
  };

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    // 2024-01-01 is a Monday.
    const date = new Date(Date.UTC(2024, 0, 1 + i));
    const fmt = (weekday: "short" | "long") =>
      new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" }).format(date);
    return { short: fmt("short"), long: fmt("long") };
  });

  const leading = data ? mondayIndex(days[0].date) : 0;
  const cells: (DayAvailability | null)[] = [...Array(leading).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const dayLabel = (day: DayAvailability) =>
    t(`day.${day.state}`, {
      date: formatDate(day.date, locale, { day: "numeric", month: "short", year: "numeric" }),
      count: day.seatsLeft,
    });

  return (
    <div
      tabIndex={-1}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        "border-line short:p-2 rounded-xl border bg-white p-3 outline-none",
        invalid && "border-danger",
      )}
    >
      <div className="short:pb-1 flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={() => goToMonth(addMonths(month, -1))}
          disabled={month <= minMonth}
          aria-label={t("prevMonth")}
          className="hover:bg-sand-100 short:size-8 grid size-10 place-items-center rounded-full transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p
          id={monthLabelId}
          aria-live="polite"
          className="font-display short:text-base text-lg capitalize"
        >
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => goToMonth(addMonths(month, 1))}
          disabled={month >= maxMonth}
          aria-label={t("nextMonth")}
          className="hover:bg-sand-100 short:size-8 grid size-10 place-items-center rounded-full transition-colors disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <p id={hintId} className="sr-only">
        {t("keyboardHint")}
      </p>

      {failed ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-sm" role="alert">
          <p className="text-ink-soft">{t("loadError")}</p>
          <button
            type="button"
            onClick={() =>
              setStore((s) => {
                const rest = { ...s.failed };
                delete rest[month];
                return { ...s, failed: rest };
              })
            }
            className="text-terracotta inline-flex items-center gap-1.5 py-2 font-medium hover:underline"
          >
            <RotateCw className="size-4" aria-hidden />
            {t("retry")}
          </button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="grid grid-cols-7 gap-1 pt-7">
          <span className="sr-only" role="status">
            {t("loading")}
          </span>
          {Array.from({ length: 35 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="bg-sand-100 short:h-8 h-11 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <table
          ref={gridRef}
          role="grid"
          aria-labelledby={`${labelledBy} ${monthLabelId}`}
          aria-describedby={hintId}
          onKeyDown={onGridKeyDown}
          className="w-full table-fixed border-separate border-spacing-0.5"
        >
          <thead>
            <tr>
              {weekdays.map((weekday) => (
                <th
                  key={weekday.long}
                  scope="col"
                  abbr={weekday.long}
                  className="text-muted pb-1 text-[11px] font-medium tracking-wide uppercase"
                >
                  {weekday.short}
                </th>
              ))}
            </tr>
          </thead>
          {/* Keyed by month so a month change crossfades in. */}
          <tbody key={month} className="animate-fade-in">
            {weeks.map((week, w) => (
              <tr key={w}>
                {week.map((day, d) => {
                  if (!day) return <td key={`blank-${d}`} aria-hidden />;
                  const selectable = isSelectable(day.state);
                  const selected = day.date === value;
                  return (
                    <td key={day.date} aria-selected={selected}>
                      <button
                        type="button"
                        data-date={day.date}
                        data-state={day.state}
                        tabIndex={day.date === activeDate ? 0 : -1}
                        aria-disabled={!selectable || undefined}
                        // Keep the roving position in sync with real focus (mouse,
                        // programmatic or assistive tech), so arrows move from here.
                        onFocus={() => setFocusDate(day.date)}
                        onClick={() => {
                          setFocusDate(day.date);
                          if (selectable) onChange(day);
                        }}
                        className={cn(
                          "short:h-8 short:text-[13px] flex h-11 w-full flex-col items-center justify-center rounded-lg text-sm transition-colors duration-200",
                          selectable && !selected && "text-ink hover:bg-sand-100",
                          day.state === "full" && "text-muted/70 cursor-not-allowed line-through",
                          (day.state === "past" || day.state === "tooSoon") &&
                            "text-muted/45 cursor-not-allowed",
                          selected && "bg-terracotta text-sand-50 shadow-sm",
                        )}
                      >
                        <span className="sr-only">{dayLabel(day)}</span>
                        <span aria-hidden className="leading-none font-medium tabular-nums">
                          {Number(day.date.slice(8))}
                        </span>
                        {day.state === "limited" && (
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1 flex items-center gap-0.5 text-[9px] leading-none font-semibold whitespace-nowrap",
                              selected ? "text-sand-50" : "text-terracotta",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1 rounded-full",
                                selected ? "bg-sand-50" : "bg-terracotta",
                              )}
                            />
                            {t("seatsShort", { count: day.seatsLeft })}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ul
        aria-hidden
        className="border-line text-muted short:mt-1 short:pt-1.5 mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[11px]"
      >
        <li className="flex items-center gap-1.5">
          <span className="border-sand-300 size-2 rounded-full border" />
          {t("legendAvailable")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="bg-terracotta size-2 rounded-full" />
          {t("legendLimited")}
        </li>
        <li className="flex items-center gap-1.5 line-through">{t("legendFull")}</li>
      </ul>
    </div>
  );
}
