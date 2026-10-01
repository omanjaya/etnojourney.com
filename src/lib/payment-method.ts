/** Midtrans `payment_type` codes we have translated labels for (plus our dev simulator). */
export const KNOWN_PAYMENT_METHODS = [
  "bank_transfer",
  "echannel",
  "credit_card",
  "gopay",
  "shopeepay",
  "qris",
  "cstore",
  "akulaku",
  "simulator",
] as const;

export type KnownPaymentMethod = (typeof KNOWN_PAYMENT_METHODS)[number];

const isKnown = (method: string): method is KnownPaymentMethod =>
  (KNOWN_PAYMENT_METHODS as readonly string[]).includes(method);

/** "some_new_method" -> "Some New Method" for codes we haven't translated yet. */
function titleCase(code: string): string {
  return code
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Human label for a payment method code. `translate` resolves known codes
 * (e.g. `getTranslations({ locale, namespace: "payment.methods" })`), so this
 * works both in requests and in emails rendered with an explicit locale.
 */
export function paymentMethodLabel(
  method: string | null | undefined,
  translate: (code: KnownPaymentMethod) => string,
): string {
  const code = method?.trim().toLowerCase();
  if (!code) return "-";
  return isKnown(code) ? translate(code) : titleCase(code);
}
