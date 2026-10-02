import type { UserRole } from "@/server/db/schema";

/**
 * Pure rules for guide records and partner portal accounts (no server-only
 * imports, tested with Vitest). The service applies the link rules under row
 * locks, so the inputs are current.
 */

/** Languages a guide can be tagged with (ISO 639-1), in display order. */
export const GUIDE_LANGUAGES = ["id", "en", "ja", "zh", "fr", "de", "nl", "ko"] as const;
export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

export function isGuideLanguage(code: string): code is GuideLanguage {
  return (GUIDE_LANGUAGES as readonly string[]).includes(code);
}

/**
 * Normalises a phone number to E.164 (`+<country><number>`). Spaces, dashes,
 * dots and brackets are dropped; `00` becomes `+`; a national Indonesian
 * number (`08…`) or one written as `62…` gets `+62`. Returns null when the
 * result is not 8 to 15 digits after the `+`.
 */
export function normalizePhone(raw: string): string | null {
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (!value) return null;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  else if (value.startsWith("0")) value = `+62${value.slice(1)}`;
  else if (value.startsWith("62")) value = `+${value}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

/** Emails are compared and stored lowercase (Better Auth stores them that way too). */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Known codes only, lowercase, without duplicates, in `GUIDE_LANGUAGES` order. */
export function normalizeLanguages(raw: readonly string[]): GuideLanguage[] {
  const wanted = new Set(raw.map((code) => code.trim().toLowerCase()));
  return GUIDE_LANGUAGES.filter((code) => wanted.has(code));
}

/* ---------------------------------------------------------------- */
/* Partner portal accounts                                           */
/* ---------------------------------------------------------------- */

export type LinkError =
  "guideAccountBackoffice" | "guideAccountDisabled" | "guideAccountLinked" | "guideAlreadyLinked";

/**
 * Whether `account` may become the portal login of guide `guideId`.
 * Back-office accounts are never turned into partners (that would silently
 * strip their access), an account serves one guide only, and a guide has one
 * account (unlink first to replace it). Re-linking the same pair is allowed
 * (it restores the `partner` role), unless the account has since become
 * back-office or disabled.
 */
export function linkError(params: {
  guideId: number;
  /** The account currently linked to this guide, if any. */
  guideUserId: string | null;
  account: { id: string; role: UserRole; disabledAt: Date | null };
  /** The guide this account is already linked to, if any. */
  accountGuideId: number | null;
}): LinkError | null {
  const { guideId, guideUserId, account, accountGuideId } = params;
  if (account.role === "staff" || account.role === "admin") return "guideAccountBackoffice";
  if (account.disabledAt !== null) return "guideAccountDisabled";
  if (isSameLink(params)) return null;
  if (accountGuideId !== null && accountGuideId !== guideId) return "guideAccountLinked";
  if (guideUserId !== null && guideUserId !== account.id) return "guideAlreadyLinked";
  return null;
}

export function isSameLink(params: { guideUserId: string | null; account: { id: string } }) {
  return params.guideUserId === params.account.id;
}

/** Role after unlinking: a partner goes back to traveller; any other role is kept. */
export function roleAfterUnlink(role: UserRole): UserRole {
  return role === "partner" ? "user" : role;
}

/* ---------------------------------------------------------------- */
/* Partner portal windows                                            */
/* ---------------------------------------------------------------- */

/** Past departures stay visible to the partner for this many days. */
export const PARTNER_PAST_DAYS = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Whether a departure date is inside the partner's window (recent past or future). */
export function inPartnerWindow(date: string, oldestVisible: string): boolean {
  return isIsoDate(date) && date >= oldestVisible;
}
