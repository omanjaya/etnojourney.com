import { MIN_LEAD_DAYS } from "./booking.rules";

/**
 * Pure availability rules. Dates are business calendar dates (`YYYY-MM-DD`,
 * Asia/Jakarta) and months are `YYYY-MM`; all arithmetic is done in UTC so
 * results never depend on the host time zone. Safe to import from the client.
 */

export type DayState = "past" | "closed" | "tooSoon" | "full" | "limited" | "available";

export type DayAvailability = {
  date: string;
  /** Seats still bookable; always 0 for past, closed and too-soon dates. */
  seatsLeft: number;
  state: DayState;
};

export type MonthAvailability = {
  month: string;
  capacity: number;
  days: DayAvailability[];
};

/** How many months ahead (after the current one) can be browsed and booked. */
export const MAX_MONTHS_AHEAD = 12;

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d ?? 1);
};
const isoOf = (time: number) => new Date(time).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return isoOf(toUtc(date) + days * 86_400_000);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  return isoOf(Date.UTC(y, m - 1 + months, 1)).slice(0, 7);
}

/** Every calendar date of a month, in order. */
export function daysInMonth(month: string): string[] {
  const first = toUtc(`${month}-01`);
  const next = toUtc(`${addMonths(month, 1)}-01`);
  const days: string[] = [];
  for (let t = first; t < next; t += 86_400_000) days.push(isoOf(t));
  return days;
}

/** 0 = Monday … 6 = Sunday, for laying out a Monday-first grid. */
export function mondayIndex(date: string): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function isMonthInRange(month: string, today: string): boolean {
  const current = monthOf(today);
  return month >= current && month <= addMonths(current, MAX_MONTHS_AHEAD);
}

/** Few seats left: at most 2, or at most a quarter of the capacity. */
export function isLimited(seatsLeft: number, capacity: number): boolean {
  return seatsLeft > 0 && (seatsLeft <= 2 || seatsLeft <= capacity * 0.25);
}

export function dayState(params: {
  date: string;
  today: string;
  seatsLeft: number;
  capacity: number;
  /** An admin closed this date for the tour (or for all tours). */
  closed?: boolean;
}): DayState {
  const { date, today, seatsLeft, capacity, closed = false } = params;
  if (date < today) return "past";
  if (closed) return "closed";
  if (date < addDays(today, MIN_LEAD_DAYS)) return "tooSoon";
  if (seatsLeft <= 0) return "full";
  return isLimited(seatsLeft, capacity) ? "limited" : "available";
}

export function isSelectable(state: DayState): boolean {
  return state === "available" || state === "limited";
}

/** Combines seats already taken and closed dates with the rules into a month view. */
export function buildMonthAvailability(params: {
  month: string;
  today: string;
  capacity: number;
  taken: ReadonlyMap<string, number>;
  /** Dates closed for this tour, either for the tour itself or for all tours. */
  closed?: ReadonlySet<string>;
}): MonthAvailability {
  const { month, today, capacity, taken, closed } = params;
  return {
    month,
    capacity,
    days: daysInMonth(month).map((date) => {
      const raw = Math.max(0, capacity - (taken.get(date) ?? 0));
      const state = dayState({ date, today, seatsLeft: raw, capacity, closed: closed?.has(date) });
      const bookable = state === "full" || state === "limited" || state === "available";
      return { date, state, seatsLeft: bookable ? raw : 0 };
    }),
  };
}

/* ------------------------------ closures ------------------------------ */

/** Most dates one close action may cover. */
export const MAX_CLOSURE_DAYS = 92;

export type ClosureScope = { tourId: number | null; date: string };

/**
 * Whether `tourId` is closed on `date`: a closure for that tour or one for
 * all tours (`tourId: null`) on the same date.
 */
export function isClosedOn(
  closures: readonly ClosureScope[],
  tourId: number,
  date: string,
): boolean {
  return closures.some((c) => c.date === date && (c.tourId === null || c.tourId === tourId));
}

/** Every date a tour is closed on, from closures for it and for all tours. */
export function closedDatesFor(closures: readonly ClosureScope[], tourId: number): Set<string> {
  return new Set(
    closures.filter((c) => c.tourId === null || c.tourId === tourId).map((c) => c.date),
  );
}

/** Inclusive number of days between two dates (1 when they are equal). */
export function daysInclusive(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000) + 1;
}

/** Every date from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function dateRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Last date a closure may be placed on: the end of the last bookable month. */
export function lastClosableDate(today: string): string {
  return addDays(`${addMonths(monthOf(today), MAX_MONTHS_AHEAD + 1)}-01`, -1);
}

export type ClosureRangeIssue = "closurePast" | "closureRange" | "closureTooLong" | "closureTooFar";

/**
 * Checks a requested closure range. Past dates cannot be closed, the range
 * runs forwards, covers at most MAX_CLOSURE_DAYS and stays inside the
 * bookable window (MAX_MONTHS_AHEAD).
 */
export function closureRangeIssue(params: {
  from: string;
  to: string;
  today: string;
}): ClosureRangeIssue | null {
  const { from, to, today } = params;
  if (from < today) return "closurePast";
  if (to < from) return "closureRange";
  if (daysInclusive(from, to) > MAX_CLOSURE_DAYS) return "closureTooLong";
  if (to > lastClosableDate(today)) return "closureTooFar";
  return null;
}

export type ClosureRow = {
  id: number;
  tourId: number | null;
  date: string;
  reason: string | null;
  createdBy: string | null;
};

export type ClosureGroup<T extends ClosureRow> = {
  from: string;
  to: string;
  rows: T[];
};

/**
 * Folds closures into runs of consecutive dates that share the tour, reason
 * and author, so a 30-day closure shows as one line instead of 30.
 */
export function groupClosures<T extends ClosureRow>(rows: readonly T[]): ClosureGroup<T>[] {
  const sorted = [...rows].sort(
    (a, b) =>
      String(a.tourId ?? "").localeCompare(String(b.tourId ?? ""), undefined, { numeric: true }) ||
      (a.reason ?? "").localeCompare(b.reason ?? "") ||
      (a.createdBy ?? "").localeCompare(b.createdBy ?? "") ||
      a.date.localeCompare(b.date),
  );
  const groups: ClosureGroup<T>[] = [];
  for (const row of sorted) {
    const last = groups.at(-1);
    const head = last?.rows[0];
    if (
      last &&
      head &&
      head.tourId === row.tourId &&
      head.reason === row.reason &&
      head.createdBy === row.createdBy &&
      addDays(last.to, 1) === row.date
    ) {
      last.rows.push(row);
      last.to = row.date;
    } else {
      groups.push({ from: row.date, to: row.date, rows: [row] });
    }
  }
  return groups.sort((a, b) => a.from.localeCompare(b.from) || a.rows[0].id - b.rows[0].id);
}

export type DayLoad = { seats: number; bookings: number };

export type AdminDay = {
  date: string;
  past: boolean;
  /** Seats held by pending and confirmed bookings. */
  seats: number;
  /** Number of pending and confirmed bookings. */
  bookings: number;
  /** Tour capacity; null in the all-tours view. */
  capacity: number | null;
  /** Closure for exactly the viewed scope (this tour, or all tours); reopenable here. */
  closure: { id: number; reason: string | null } | null;
  /** Tour view only: the date is closed for all tours. */
  closedForAll: boolean;
  /** All-tours view only: how many single tours are closed on this date. */
  toursClosed: number;
};

/**
 * Back-office month: bookings and closures per date for one tour
 * (`tourId`) or for all tours (`tourId: null`).
 */
export function buildAdminMonth(params: {
  month: string;
  today: string;
  tourId: number | null;
  capacity: number | null;
  load: ReadonlyMap<string, DayLoad>;
  closures: readonly ClosureRow[];
}): AdminDay[] {
  const { month, today, tourId, capacity, load, closures } = params;
  return daysInMonth(month).map((date) => {
    const onDate = closures.filter((c) => c.date === date);
    const own = onDate.find((c) => c.tourId === tourId);
    const day = load.get(date);
    return {
      date,
      past: date < today,
      seats: day?.seats ?? 0,
      bookings: day?.bookings ?? 0,
      capacity,
      closure: own ? { id: own.id, reason: own.reason } : null,
      closedForAll: tourId !== null && onDate.some((c) => c.tourId === null),
      toursClosed: tourId === null ? onDate.filter((c) => c.tourId !== null).length : 0,
    };
  });
}
