/**
 * Pure rules for photo credits (no server-only imports, so components and
 * tests can use them).
 */

/**
 * Temporary AI images are credited with a license starting with this word
 * (content/README.md, "Temporary AI placeholders"). It is the only marker, so
 * fixing the license in the back office also clears the placeholder flag.
 */
export const PLACEHOLDER_LICENSE_PREFIX = "Placeholder";

export function isPlaceholderCredit(credit: { license: string }): boolean {
  return credit.license
    .trim()
    .toLowerCase()
    .startsWith(PLACEHOLDER_LICENSE_PREFIX.toLowerCase());
}

/**
 * Site photos are referenced from code (home hero, about page, sign-in
 * layout), not from the catalogue, so they always count as in use.
 */
export const SITE_PHOTO_PREFIX = "/images/content/site/";

export const isSitePhoto = (path: string) => path.startsWith(SITE_PHOTO_PREFIX);

/**
 * Why a credit may not be deleted, or null when it may. Only credits of
 * uploads the site no longer shows can go: curated content credits come back
 * with the next content sync anyway, and a photo still in use must keep its
 * attribution (CC BY / BY-SA require it).
 */
export function creditDeletionBlocker(credit: {
  path: string;
  inUse: boolean;
}): "inUse" | "notUpload" | null {
  if (credit.inUse || isSitePhoto(credit.path)) return "inUse";
  if (!credit.path.startsWith("/media/")) return "notUpload";
  return null;
}

/**
 * Credit wording that comes from the content files in English. Shown in the
 * visitor's language; any other text (names, CC license names, original
 * titles) is attribution and stays as stored.
 */
const knownCreditTexts = {
  "AI illustration": "aiIllustration",
  "Placeholder, not the real place": "placeholder",
  "Public domain": "publicDomain",
  "Unsplash License": "unsplash",
} as const;

export type KnownCreditText = (typeof knownCreditTexts)[keyof typeof knownCreditTexts];

export function knownCreditText(value: string): KnownCreditText | null {
  return Object.hasOwn(knownCreditTexts, value)
    ? knownCreditTexts[value as keyof typeof knownCreditTexts]
    : null;
}
