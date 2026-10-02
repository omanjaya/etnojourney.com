import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/features/content/components/legal-document";
import {
  RefundTiersTable,
  RescheduleRules,
} from "@/features/self-service/components/cancellation-terms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cancellation-policy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages.cancellation" });
  return pageMetadata({
    locale,
    path: "/cancellation-policy",
    title: t("meta.title"),
    description: t("meta.description"),
  });
}

export default async function CancellationPolicyPage({
  params,
}: PageProps<"/[locale]/cancellation-policy">) {
  setRequestLocale((await params).locale as Locale);
  // Tiers and date-change rules are rendered from src/config/cancellation.ts.
  return (
    <LegalDocument
      document="cancellation"
      extras={{ paid: <RefundTiersTable />, changes: <RescheduleRules /> }}
    />
  );
}
