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
