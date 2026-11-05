import type { Locale } from "@/i18n/routing";

/**
 * Time zone for business dates (lead time, "today", timestamps shown to users).
 * Fixed so server and browser agree regardless of where either runs.
 */
export const BUSINESS_TIME_ZONE = "Asia/Jakarta";

const intlLocale: Record<Locale, string> = { id: "id-ID", en: "en-US" };

export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a calendar date (`YYYY-MM-DD`) or an instant (`Date`).
 * Calendar dates are rendered as-is (no time zone shift); instants are shown
 * in the business time zone.
 */
export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  if (typeof value === "string") {
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(intlLocale[locale], { ...options, timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, d)),
    );
  }
  return new Intl.DateTimeFormat(intlLocale[locale], {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  }).format(value);
}

/** Today's calendar date in the business time zone, as `YYYY-MM-DD`. */
function businessToday(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Returns the `YYYY-MM-DD` date `days` after today in the business time zone.
 * Gives the same answer on a UTC server and in a browser anywhere.
 */
export function isoDateFromToday(days: number, now: Date = new Date()): string {
  const [y, m, d] = businessToday(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
