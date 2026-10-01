import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/features/content/components/legal-document";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages.terms" });
  return pageMetadata({
    locale,
    path: "/terms",
    title: t("meta.title"),
    description: t("meta.description"),
  });
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  setRequestLocale((await params).locale as Locale);
  return <LegalDocument document="terms" />;
}
