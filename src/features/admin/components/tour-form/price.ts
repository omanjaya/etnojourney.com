import type { Locale } from "@/i18n/routing";

const grouping: Record<Locale, string> = { id: "id-ID", en: "en-US" };

/**
 * Rupiah amount from what the operator typed. Every non-digit is dropped, so
 * "450.000", "450,000" and "Rp 450.000" all mean 450000 (Rupiah has no cents).
 */
export function parsePrice(raw: string): number | "" {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? "" : Number(digits);
}

/**
 * Pasted text without a trailing cents part, which `parsePrice` would
 * otherwise read as extra digits ("Rp 350.000,00" would become 35000000).
 * Only for pasted text: while typing, "45.00" is a half-deleted "45.000".
 */
export const stripCents = (text: string) => text.replace(/[.,]\d{1,2}\s*$/, "");

/** The amount with thousands separators for the price input ("450.000" in id). */
export function formatPriceInput(value: number | "", locale: Locale): string {
  return value === "" ? "" : new Intl.NumberFormat(grouping[locale]).format(value);
}

/** Number of digits in `text`, e.g. before the caret. */
export const countDigits = (text: string) => text.replace(/\D/g, "").length;

/**
 * Caret position just after the `digits`-th digit of `text`, so the caret
 * stays put when separators are added or removed while typing.
 */
export function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === digits) return i + 1;
  }
  return text.length;
}
