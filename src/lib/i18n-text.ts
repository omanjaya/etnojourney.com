import type { Locale } from "@/i18n/routing";

/** Bilingual text stored as JSONB in the database. */
export type LocalizedText = Record<Locale, string>;

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.id;
}
