import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/i18n-text";

const toLines = (items: string[]) => items.join("\n");

const fromLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Pairs ID and EN lines by index; mismatched counts surface as validation errors. */
export function pairLines(text: LocalizedText): LocalizedText[] {
  const id = fromLines(text.id);
  const en = fromLines(text.en);
  return Array.from({ length: Math.max(id.length, en.length) }, (_, i) => ({
    id: id[i] ?? "",
    en: en[i] ?? "",
  }));
}

/** Inverse of `pairLines`: one multi-line text per locale. */
export const splitPairs = (pairs: LocalizedText[]): LocalizedText => ({
  id: toLines(pairs.map((p) => p.id)),
  en: toLines(pairs.map((p) => p.en)),
});

/** Items per locale as `pairLines` will see them (blank lines ignored). */
export const lineCounts = (text: LocalizedText): Record<Locale, number> => ({
  id: fromLines(text.id).length,
  en: fromLines(text.en).length,
});

/**
 * Visible rows for both list textareas: every typed line plus a spare one,
 * at least `min`. Both sides get the same height and never scroll, so line
 * N of the Indonesian column sits level with line N of the English one.
 */
export function listRows(text: LocalizedText, min: number): number {
  const rawLines = (value: string) => value.split("\n").length;
  return Math.max(min, rawLines(text.id) + 1, rawLines(text.en) + 1);
}
