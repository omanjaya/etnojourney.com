/** Date each legal document was last revised (YYYY-MM-DD). Update when its text changes. */
export const LEGAL_UPDATED = {
  privacy: "2026-10-01",
  terms: "2026-10-01",
  // Refund tiers and self-service cancel/reschedule.
  cancellation: "2026-10-02",
} as const;

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
};

export type FaqGroup = { title: string; items: { q: string; a: string }[] };
