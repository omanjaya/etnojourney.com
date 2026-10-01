import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/features/content/components/legal-document";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages.privacy" });
  return pageMetadata({
    locale,
    path: "/privacy",
    title: t("meta.title"),
    description: t("meta.description"),
  });
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  setRequestLocale((await params).locale as Locale);
  return <LegalDocument document="privacy" />;
}
