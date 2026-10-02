import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { groupByIsland } from "@/lib/regions";
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
  const [t, tc, items] = await Promise.all([
    getTranslations("destinations.list"),
    getTranslations("common.islands"),
    destinationService.listWithTourCount(),
  ]);
  // Within an island, lead with the destinations that have the most tours.
  const ordered = [...items].sort(
    (a, b) => b.tourCount - a.tourCount || a.destination.name.localeCompare(b.destination.name),
  );
  const groups = groupByIsland(ordered, (item) => item.destination.province);

  return (
    <>
      <PageHeader compact eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
        {groups.length > 1 && (
          <nav aria-label={t("jumpTo")} className="short:mt-5 mt-6 flex flex-wrap gap-2 md:mt-8">
            {groups.map(({ island, items: group }) => (
              <a
                key={island}
                href={`#${island}`}
                className="border-line text-ink-soft hover:border-ink hover:text-ink inline-flex min-h-10 items-center gap-2 rounded-full border bg-white/70 px-4 text-sm font-medium transition-colors"
              >
                {tc(island)}
                <span className="text-muted text-xs tabular-nums">{group.length}</span>
              </a>
            ))}
          </nav>
        )}
      </PageHeader>

      <div className="short:py-10 py-12 md:py-16 xl:py-20">
        {groups.map(({ island, items: group }, groupIndex) => (
          <section
            key={island}
            id={island}
            aria-labelledby={`${island}-heading`}
            className={cn("scroll-mt-24", groupIndex > 0 && "short:mt-16 mt-16 md:mt-24")}
          >
            <Container>
              <div className="border-line short:mb-5 short:pb-3 mb-6 flex items-end justify-between gap-4 border-b pb-4">
                <h2 id={`${island}-heading`} className="text-3xl md:text-4xl">
                  {tc(island)}
                </h2>
                <p className="text-muted text-sm">
                  {t("destinationCount", { count: group.length })}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
                {group.map(({ destination, tourCount }, i) => (
                  <Reveal
                    key={destination.id}
                    variant={i % 2 === 0 ? "mask-left" : "mask-up"}
                    delay={Math.min((i % 2) * 0.15, 0.4)}
                    className={cn(
                      // A lone card in a group spans the full width.
                      group.length === 1 ? "md:col-span-2 lg:col-span-12" : spans[i % spans.length],
                    )}
                  >
                    <DestinationCard
                      destination={destination}
                      tourCount={tourCount}
                      eager={groupIndex === 0 && i === 0}
                      headingLevel="h3"
                      className="short:h-[24rem] h-[26rem] md:h-[30rem] xl:h-[32rem]"
                      sizes="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
                    />
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        ))}
      </div>
    </>
  );
}
