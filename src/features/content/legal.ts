/** Date the legal templates were last revised (YYYY-MM-DD). Update when the text changes. */
export const LEGAL_UPDATED = "2026-10-01";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
};

export type FaqGroup = { title: string; items: { q: string; a: string }[] };
