import { MIN_LEAD_DAYS } from "./booking.rules";

/**
 * Pure availability rules. Dates are business calendar dates (`YYYY-MM-DD`,
 * Asia/Jakarta) and months are `YYYY-MM`; all arithmetic is done in UTC so
 * results never depend on the host time zone. Safe to import from the client.
 */

export type DayState = "past" | "tooSoon" | "full" | "limited" | "available";

export type DayAvailability = {
  date: string;
  /** Seats still bookable; always 0 for past and too-soon dates. */
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
}): DayState {
  const { date, today, seatsLeft, capacity } = params;
  if (date < today) return "past";
  if (date < addDays(today, MIN_LEAD_DAYS)) return "tooSoon";
  if (seatsLeft <= 0) return "full";
  return isLimited(seatsLeft, capacity) ? "limited" : "available";
}

export function isSelectable(state: DayState): boolean {
  return state === "available" || state === "limited";
}

/** Combines seats already taken per date with the rules into a month view. */
export function buildMonthAvailability(params: {
  month: string;
  today: string;
  capacity: number;
  taken: ReadonlyMap<string, number>;
}): MonthAvailability {
  const { month, today, capacity, taken } = params;
  return {
    month,
    capacity,
    days: daysInMonth(month).map((date) => {
      const raw = Math.max(0, capacity - (taken.get(date) ?? 0));
      const state = dayState({ date, today, seatsLeft: raw, capacity });
      return { date, state, seatsLeft: state === "past" || state === "tooSoon" ? 0 : raw };
    }),
  };
}
