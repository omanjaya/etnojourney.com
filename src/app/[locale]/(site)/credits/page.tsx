import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { photoCreditService } from "@/server/services/photo-credit.service";

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "common.credit" });
  return pageMetadata({
    locale,
    path: "/credits",
    title: t("pageTitle"),
    description: t("pageDescription"),
  });
}

/** Every curated photo with its photographer, license and source. */
export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, credits] = await Promise.all([
    getTranslations("common.credit"),
    photoCreditService.all(),
  ]);

  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <Container className="py-16">
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {credits.map((credit) => (
            <li key={credit.path} className="flex gap-4">
              <div className="bg-sand-200 relative size-20 shrink-0 overflow-hidden rounded-xl">
                <Image src={credit.path} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <dl className="min-w-0 text-sm">
                <dt className="sr-only">{t("columns.photo")}</dt>
                <dd className="font-medium break-words">{credit.title}</dd>
                <dt className="sr-only">{t("columns.author")}</dt>
                <dd className="text-ink-soft truncate">{credit.author}</dd>
                <dt className="sr-only">{t("columns.license")}</dt>
                <dd className="text-muted">
                  {credit.licenseUrl ? (
                    <a
                      href={credit.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer license"
                      className="hover:text-terracotta underline underline-offset-2"
                    >
                      {credit.license}
                    </a>
                  ) : (
                    credit.license
                  )}
                  {" · "}
                  <a
                    href={credit.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-terracotta underline underline-offset-2"
                  >
                    {credit.source}
                  </a>
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
