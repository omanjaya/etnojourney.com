import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

export type PlaceholderOwnerRow = {
  key: string;
  kind: "tour" | "destination";
  label: string;
  href: string;
  images: number;
  draft: boolean;
};

/**
 * Tours and destinations that still show temporary AI illustrations, each
 * linking to its edit page, where the photos to replace are marked.
 */
export function PlaceholderUsage({ rows }: { rows: PlaceholderOwnerRow[] }) {
  const t = useTranslations("adminInsights.credits.placeholders");
  if (rows.length === 0) return null;

  return (
    <section
      id="placeholders"
      aria-labelledby="placeholders-title"
      className="border-gold/40 bg-gold-light/40 mb-8 scroll-mt-24 rounded-(--radius-card) border p-5"
    >
      <h2 id="placeholders-title" className="flex items-center gap-2 text-xl">
        <Sparkles className="size-5 text-[#8a6420]" aria-hidden />
        {t("title")}
      </h2>
      <p className="text-ink-soft mt-1 max-w-2xl text-sm">{t("description")}</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className="group border-line hover:border-terracotta/40 flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.label}</span>
                <span className="text-muted block text-xs">
                  {t(row.kind)} &middot; {t("images", { count: row.images })}
                </span>
              </span>
              {row.draft && <Badge>{t("draft")}</Badge>}
              <ArrowRight
                className="text-muted size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
