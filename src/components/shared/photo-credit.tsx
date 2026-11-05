import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { knownCreditText, type KnownCreditText } from "@/server/services/photo-credit.rules";

/** Attribution shown next to curated photos (CC BY / BY-SA require it). */
export type ImageCredit = {
  author: string;
  license: string;
  licenseUrl: string | null;
  /** Null for photos without a web page (e.g. the operator's own). */
  sourceUrl: string | null;
};

/**
 * Shows credit wording from the content files (written in English, e.g. the
 * AI placeholder notice) in the visitor's language; names and license names
 * stay as stored, since attribution must not change them. `t` is the
 * `common.credit.known` translator.
 */
export function creditText(value: string, t: (key: KnownCreditText) => string): string {
  const key = knownCreditText(value);
  return key ? t(key) : value;
}

export function PhotoCredit({
  credit,
  className,
}: {
  credit: ImageCredit | undefined;
  className?: string;
}) {
  const t = useTranslations("common.credit");
  const tk = useTranslations("common.credit.known");
  if (!credit) return null;
  const text = (value: string) => creditText(value, tk);
  return (
    <p className={cn("text-xs leading-relaxed", className)}>
      {t("photo")}:{" "}
      {credit.sourceUrl ? (
        <a
          href={credit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
        >
          {text(credit.author)}
        </a>
      ) : (
        text(credit.author)
      )}
      {" · "}
      {credit.licenseUrl ? (
        <a
          href={credit.licenseUrl}
          target="_blank"
          rel="noopener noreferrer license"
          className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
        >
          {text(credit.license)}
        </a>
      ) : (
        text(credit.license)
      )}
    </p>
  );
}

/** Serializable credits map for client components. */
export function toCreditMap(
  credits: Map<
    string,
    { author: string; license: string; licenseUrl: string | null; sourceUrl: string | null }
  >,
): Record<string, ImageCredit> {
  return Object.fromEntries(
    [...credits].map(([path, c]) => [
      path,
      { author: c.author, license: c.license, licenseUrl: c.licenseUrl, sourceUrl: c.sourceUrl },
    ]),
  );
}
