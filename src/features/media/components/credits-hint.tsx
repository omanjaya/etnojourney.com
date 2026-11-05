import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Tells the operator where uploaded photos get their credit. Opens in a new
 * tab so unsaved changes in the form are not lost.
 */
export function CreditsHint() {
  const t = useTranslations("media.form");
  return (
    <p className="text-xs text-muted">
      {t.rich("creditsHint", {
        link: (chunks) => (
          <Link
            href="/admin/credits"
            target="_blank"
            className="inline-flex items-center gap-1 font-medium text-terracotta underline underline-offset-2"
          >
            {chunks}
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">{t("opensNewTab")}</span>
          </Link>
        ),
      })}
    </p>
  );
}
