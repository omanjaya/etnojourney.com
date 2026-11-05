import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Attribution shown next to curated photos (CC BY / BY-SA require it). */
export type ImageCredit = {
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
};

export function PhotoCredit({
  credit,
  className,
}: {
  credit: ImageCredit | undefined;
  className?: string;
}) {
  const t = useTranslations("common.credit");
  if (!credit) return null;
  return (
    <p className={cn("text-xs leading-relaxed", className)}>
      {t("photo")}:{" "}
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
      >
        {credit.author}
      </a>
      {" · "}
      {credit.licenseUrl ? (
        <a
          href={credit.licenseUrl}
          target="_blank"
          rel="noopener noreferrer license"
          className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
        >
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
    </p>
  );
}

/** Serializable credits map for client components. */
export function toCreditMap(
  credits: Map<string, { author: string; license: string; licenseUrl: string | null; sourceUrl: string }>,
): Record<string, ImageCredit> {
  return Object.fromEntries(
    [...credits].map(([path, c]) => [
      path,
      { author: c.author, license: c.license, licenseUrl: c.licenseUrl, sourceUrl: c.sourceUrl },
    ]),
  );
}
