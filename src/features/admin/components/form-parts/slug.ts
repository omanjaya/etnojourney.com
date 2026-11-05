const MAX_LENGTH = 80;

/**
 * URL slug from free text: lowercase ASCII, accents stripped, hyphen-separated,
 * max 80 chars. A long slug is cut at the last whole word, so it never ends
 * with a hyphen (which the form would reject).
 */
export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_LENGTH) return slug;
  // Look one character past the limit: a hyphen there means the cut falls between words.
  const wordEnd = slug.slice(0, MAX_LENGTH + 1).lastIndexOf("-");
  return wordEnd > 0 ? slug.slice(0, wordEnd) : slug.slice(0, MAX_LENGTH);
}
