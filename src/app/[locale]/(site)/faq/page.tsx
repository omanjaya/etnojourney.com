import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqAccordion } from "@/features/content/components/faq-accordion";
import type { FaqGroup } from "@/features/content/legal";
import { buttonVariants } from "@/components/ui/button";
import { siteContact } from "@/config/site";
import { whatsAppLink } from "@/lib/whatsapp";

const GROUP_ORDER = ["booking", "travel", "etiquette", "account"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages.faq.meta" });
  return pageMetadata({ locale, path: "/faq", title: t("title"), description: t("description") });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, tw] = await Promise.all([
    getTranslations("pages.faq"),
    getTranslations("community.whatsapp"),
  ]);
  const whatsapp = siteContact().whatsapp;
  const whatsappHref = whatsAppLink(whatsapp, tw("generalMessage"));
  // `t.raw` is typed for leaf keys only; the groups object is read as raw data.
  const raw = (t.raw as (key: string) => unknown)("groups") as Record<
    (typeof GROUP_ORDER)[number],
    FaqGroup
  >;
  const groups = GROUP_ORDER.map((id) => ({ id, group: raw[id] }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: localizedUrl("/faq", locale),
    inLanguage: locale,
    mainEntity: groups.flatMap(({ group }) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    ),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
        <nav aria-label={t("title")} className="mt-8 flex flex-wrap gap-2">
          {groups.map(({ id, group }) => (
            <a
              key={id}
              href={`#${id}`}
              className="border-line hover:border-terracotta hover:text-terracotta inline-flex min-h-10 items-center rounded-full border bg-white/60 px-4 text-sm font-medium transition-colors"
            >
              {group.title}
            </a>
          ))}
        </nav>
      </PageHeader>
      <Container className="max-w-4xl py-16 md:py-24">
        <FaqAccordion groups={groups} />
        {whatsappHref && (
          <aside
            aria-labelledby="faq-whatsapp"
            className="bg-sand-100 mt-16 flex flex-col gap-4 rounded-(--radius-card) p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"
          >
            <div>
              <h2 id="faq-whatsapp" className="text-2xl">
                {tw("faqTitle")}
              </h2>
              <p className="text-ink-soft mt-2 leading-relaxed">{tw("faqBody")}</p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tw("footerLabel", { number: `+${whatsapp}` })}
              className={buttonVariants({ variant: "dark", className: "self-start sm:self-auto" })}
            >
              <MessageCircle aria-hidden />
              {tw("ask")}
            </a>
          </aside>
        )}
      </Container>
    </>
  );
}
