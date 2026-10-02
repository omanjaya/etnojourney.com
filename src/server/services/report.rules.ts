/**
 * Pure rules for the admin reports: reporting periods in the business time
 * zone (Asia/Jakarta, fixed UTC+7, no DST) and shaping SQL aggregates into
 * gap-free series and tables. No I/O here; covered by Vitest.
 */

export const REPORT_PRESETS = [
  "this-month",
  "last-month",
  "last-90",
  "this-year",
  "custom",
] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];

/** Longest custom range; keeps the month series and queries bounded. */
export const REPORT_MAX_DAYS = 3 * 366;

/** Jakarta is UTC+7 all year round. */
const JAKARTA_OFFSET = "+07:00";

export type ReportPeriod = {
  preset: ReportPreset;
  /** Inclusive calendar dates, `YYYY-MM-DD`, in Asia/Jakarta. */
  from: string;
  to: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** Today's date in Asia/Jakarta as `YYYY-MM-DD`. */
export function jakartaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toIso(utc(y, m - 1, d + days));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Resolves the period picked in the UI. Invalid or missing custom dates fall
 * back to this month; reversed dates are swapped; overly long ranges are
 * clamped to `REPORT_MAX_DAYS` ending at `to`.
 */
export function resolvePeriod(
  input: { period?: string; from?: string; to?: string },
  today: string = jakartaToday(),
): ReportPeriod {
  const [y, m] = today.split("-").map(Number);
  const preset = (REPORT_PRESETS as readonly string[]).includes(input.period ?? "")
    ? (input.period as ReportPreset)
    : "this-month";

  switch (preset) {
    case "last-month":
      return { preset, from: toIso(utc(y, m - 2, 1)), to: toIso(utc(y, m - 1, 0)) };
    case "last-90":
      return { preset, from: addDays(today, -89), to: today };
    case "this-year":
      return { preset, from: `${y}-01-01`, to: today };
    case "custom": {
      if (!isIsoDate(input.from) || !isIsoDate(input.to)) break;
      const [start, to] = input.from <= input.to ? [input.from, input.to] : [input.to, input.from];
      const from =
        daysBetween(start, to) >= REPORT_MAX_DAYS ? addDays(to, -(REPORT_MAX_DAYS - 1)) : start;
      return { preset, from, to };
    }
  }
  return { preset: "this-month", from: toIso(utc(y, m - 1, 1)), to: today };
}

/** Half-open instant range `[start, end)` covering the period's Jakarta days. */
export function periodBounds(period: { from: string; to: string }): { start: Date; end: Date } {
  return {
    start: new Date(`${period.from}T00:00:00${JAKARTA_OFFSET}`),
    end: new Date(`${addDays(period.to, 1)}T00:00:00${JAKARTA_OFFSET}`),
  };
}

/** Every `YYYY-MM` the period touches, in order. */
export function monthsInPeriod(period: { from: string; to: string }): string[] {
  const [fy, fm] = period.from.split("-").map(Number);
  const [ty, tm] = period.to.split("-").map(Number);
  const months: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export type MonthRow = {
  month: string;
  /** Money received (payments by paid date). */
  gross: number;
  /** Money returned (refunds by refund date). */
  refunds: number;
  net: number;
  bookings: number;
  participants: number;
};

/** Joins per-month aggregates into one row per month, zero-filling gaps. */
export function buildMonthSeries(
  period: { from: string; to: string },
  data: {
    gross: { month: string; amount: number }[];
    refunds: { month: string; amount: number }[];
    bookings: { month: string; bookings: number; participants: number }[];
  },
): MonthRow[] {
  const gross = new Map(data.gross.map((r) => [r.month, r.amount]));
  const refunds = new Map(data.refunds.map((r) => [r.month, r.amount]));
  const bookings = new Map(data.bookings.map((r) => [r.month, r]));
  return monthsInPeriod(period).map((month) => {
    const g = gross.get(month) ?? 0;
    const r = refunds.get(month) ?? 0;
    return {
      month,
      gross: g,
      refunds: r,
      net: g - r,
      bookings: bookings.get(month)?.bookings ?? 0,
      participants: bookings.get(month)?.participants ?? 0,
    };
  });
}

export type TourRow<T> = {
  tourId: number;
  title: T;
  bookings: number;
  participants: number;
  gross: number;
  refunds: number;
  net: number;
};

/**
 * Merges per-tour aggregates (bookings by creation date, money by paid/refund
 * date) into one row per tour, sorted by net revenue then bookings.
 */
export function buildTourRows<T>(
  titles: Map<number, T>,
  data: {
    bookings: { tourId: number; bookings: number; participants: number }[];
    gross: { tourId: number; amount: number }[];
    refunds: { tourId: number; amount: number }[];
  },
): TourRow<T>[] {
  const rows = new Map<number, TourRow<T>>();
  const row = (tourId: number) => {
    let current = rows.get(tourId);
    if (!current) {
      const title = titles.get(tourId);
      if (title === undefined) return undefined;
      current = { tourId, title, bookings: 0, participants: 0, gross: 0, refunds: 0, net: 0 };
      rows.set(tourId, current);
    }
    return current;
  };
  for (const b of data.bookings) {
    const r = row(b.tourId);
    if (r) {
      r.bookings += b.bookings;
      r.participants += b.participants;
    }
  }
  for (const g of data.gross) {
    const r = row(g.tourId);
    if (r) r.gross += g.amount;
  }
  for (const f of data.refunds) {
    const r = row(f.tourId);
    if (r) r.refunds += f.amount;
  }
  return [...rows.values()]
    .map((r) => ({ ...r, net: r.gross - r.refunds }))
    .sort((a, b) => b.net - a.net || b.bookings - a.bookings || a.tourId - b.tourId);
}

/** Average travellers per booking, one decimal; 0 when there are no bookings. */
export function averageGroupSize(bookings: number, participants: number): number {
  return bookings > 0 ? Math.round((participants / bookings) * 10) / 10 : 0;
}

/** Share of `part` in `total` as a whole percentage (0 when total is 0). */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Bar length in percent of the largest value; tiny non-zero values stay visible. */
export function barWidth(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}
