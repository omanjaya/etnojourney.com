/**
 * WhatsApp click-to-chat links (https://wa.me/<number>?text=<message>).
 * Pure module: safe to import from server and client code and from tests.
 */

/** International format without "+": country code, then 7 to 14 more digits. */
const WHATSAPP_NUMBER = /^[1-9]\d{7,14}$/;

/**
 * Normalizes a configured number to wa.me's format. Accepts common
 * separators ("+62 812-3456-7890") but never guesses a country code:
 * a local number such as "0812..." is rejected.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw
    .trim()
    .replace(/^\+/, "")
    .replace(/[\s().-]/g, "");
  return WHATSAPP_NUMBER.test(digits) ? digits : null;
}

/** Click-to-chat URL with an optional prefilled message, or null for an invalid number. */
export function whatsAppLink(number: string | null | undefined, message?: string): string | null {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;
  const text = message?.trim();
  return text
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${normalized}`;
}
