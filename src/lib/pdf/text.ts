/**
 * Text helpers for PDFs drawn with the standard (non-embedded) fonts.
 * Standard fonts use WinAnsi encoding: pdf-lib throws on any character
 * outside it, so every string goes through `toWinAnsi` before drawing.
 */

/**
 * Code points are written as numbers on purpose: most of these characters are
 * invisible or look like ASCII, so literals would be unreviewable.
 */
const chars = (...codes: number[]) => codes.map((code) => String.fromCodePoint(code));

/** The 0x80-0x9F block of Windows-1252: the only non-Latin-1 characters WinAnsi has. */
const CP1252_EXTRAS = new Set(
  chars(
    0x20ac,
    0x201a,
    0x0192,
    0x201e,
    0x2026,
    0x2020,
    0x2021,
    0x02c6,
    0x2030,
    0x0160,
    0x2039,
    0x0152,
    0x017d,
    0x2018,
    0x2019,
    0x201c,
    0x201d,
    0x2022,
    0x2013,
    0x2014,
    0x02dc,
    0x2122,
    0x0161,
    0x203a,
    0x0153,
    0x017e,
    0x0178,
  ),
);

/** Common characters outside WinAnsi with a readable stand-in. */
const REPLACEMENTS = new Map<string, string>([
  ...chars(0x2010, 0x2011, 0x2012, 0x2015, 0x2027, 0x2043, 0x2212).map(
    (c) => [c, "-"] as [string, string], // hyphens, dashes, minus sign
  ),
  ...chars(0x2032, 0x201b).map((c) => [c, "'"] as [string, string]), // primes, reversed quote
  ...chars(0x2033, 0x201f).map((c) => [c, '"'] as [string, string]),
  [String.fromCodePoint(0x2190), "<-"],
  [String.fromCodePoint(0x2192), "->"],
  [String.fromCodePoint(0x2194), "<->"],
  [String.fromCodePoint(0x21d2), "=>"],
  [String.fromCodePoint(0x2264), "<="],
  [String.fromCodePoint(0x2265), ">="],
  [String.fromCodePoint(0x2260), "!="],
  [String.fromCodePoint(0x2248), "~"],
  [String.fromCodePoint(0x2025), ".."],
  [String.fromCodePoint(0x00ad), ""], // soft hyphen: invisible, drop it
]);

/** Spaces other than U+0020 (no-break, narrow, thin, em, ideographic, ...). */
const SPACE_LIKE = new RegExp("[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]", "g");
/** Zero-width and formatting characters that render as nothing. */
const INVISIBLE = new RegExp("[\\u200B-\\u200D\\u2060\\uFEFF]", "g");
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036F]", "g");

function isWinAnsi(char: string): boolean {
  const code = char.codePointAt(0)!;
  return (
    (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRAS.has(char)
  );
}

/**
 * Makes `input` drawable with a WinAnsi standard font, as a single line:
 * line breaks and tabs become spaces, typographic look-alikes are replaced,
 * accented letters outside Latin-1 lose their accent (e.g. "ā" -> "a"), and
 * anything else (emoji, CJK, symbols) is dropped. Runs of spaces collapse.
 */
export function toWinAnsi(input: string): string {
  let out = "";
  const text = input
    .replace(/[\r\n\t\v\f]+/g, " ")
    .replace(SPACE_LIKE, " ")
    .replace(INVISIBLE, "");
  for (const char of text) {
    if (isWinAnsi(char)) {
      out += char;
    } else if (REPLACEMENTS.has(char)) {
      out += REPLACEMENTS.get(char);
    } else {
      const base = char.normalize("NFKD").replace(COMBINING_MARKS, "");
      out += Array.from(base).every(isWinAnsi) ? base : "";
    }
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/**
 * Greedy word wrap. `measure` returns the drawn width of a string (e.g.
 * `font.widthOfTextAtSize(s, size)`); words longer than `maxWidth` are split
 * by character so nothing overflows the page.
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const pushLongWord = (word: string) => {
    let chunk = "";
    for (const char of word) {
      if (chunk && measure(chunk + char) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = measure(word) <= maxWidth ? word : pushLongWord(word);
  }
  if (line) lines.push(line);
  return lines;
}

/** A download filename made only of `[A-Za-z0-9._-]`. */
export function safeFilename(name: string, fallback = "download"): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}
