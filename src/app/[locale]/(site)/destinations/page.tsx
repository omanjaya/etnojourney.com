import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { DestinationCard } from "@/components/shared/destination-card";
import { Reveal } from "@/components/shared/reveal";
import { destinationService } from "@/server/services/destination.service";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/destinations">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "destinations.meta" });
  return pageMetadata({
    locale,
    path: "/destinations",
    title: t("title"),
    description: t("description"),
  });
}

// Repeating editorial rhythm: wide, narrow, narrow, wide...
const spans = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"];

export default async function DestinationsPage({ params }: PageProps<"/[locale]/destinations">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, items] = await Promise.all([
    getTranslations("destinations.list"),
    destinationService.listWithTourCount(),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Container className="grid gap-5 py-16 md:grid-cols-2 md:py-24 lg:grid-cols-12 lg:gap-6">
        <h2 className="sr-only">{t("gridHeading")}</h2>
        {items.map(({ destination, tourCount }, i) => (
          <Reveal
            key={destination.id}
            variant={i % 2 === 0 ? "mask-left" : "mask-up"}
            delay={Math.min((i % 2) * 0.15, 0.4)}
            className={cn(spans[i % spans.length])}
          >
            <DestinationCard
              destination={destination}
              tourCount={tourCount}
              eager={i === 0}
              className="h-[26rem] md:h-[32rem]"
              sizes="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
            />
          </Reveal>
        ))}
      </Container>
    </>
  );
}
