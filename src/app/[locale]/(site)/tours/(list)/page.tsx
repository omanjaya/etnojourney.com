import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Compass } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/shared/reveal";
import { TourCard } from "@/components/shared/tour-card";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { TourFilters } from "@/features/tours/components/tour-filters";
import { parseTourSearch, toTourFilters } from "@/features/tours/search-params";
import { getCurrentUser } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { tourService } from "@/server/services/tour.service";
import { wishlistService } from "@/server/services/wishlist.service";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tours">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "tours.meta" });
  return pageMetadata({ locale, path: "/tours", title: t("title"), description: t("description") });
}

export default async function ToursPage({ params, searchParams }: PageProps<"/[locale]/tours">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const search = parseTourSearch(await searchParams);
  const [t, results, destinations, user] = await Promise.all([
    getTranslations("tours.list"),
    tourService.search(toTourFilters(search)),
    destinationService.list(),
    getCurrentUser(),
  ]);
  const saved = user ? await wishlistService.tourIds(user.id) : new Set<number>();
  // A new key per filter combination makes React treat old and new results as
  // an exit/enter pair, so filtering crossfades instead of snapping.
  const resultsKey = JSON.stringify(search);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <Container className="py-12 md:py-16">
        <TourFilters
          search={search}
          destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))}
        />

        <h2 className="sr-only">{t("resultsHeading")}</h2>
        {/* Outside the keyed block so the live region persists and announces changes. */}
        <p className="text-muted mt-10 text-sm" aria-live="polite">
          {t("results", { count: results.length })}
        </p>

        <ViewTransition
          key={resultsKey}
          name="tour-results"
          share="auto"
          enter="auto"
          default="none"
        >
          <div>
            {results.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={Compass}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                  <Button asChild variant="outline">
                    <Link href="/tours">{t("reset")}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="mt-6 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item, i) => (
                  <Reveal key={item.tour.id} delay={Math.min((i % 3) * 0.09, 0.4)}>
                    <TourCard
                      data={item}
                      priority={i < 3}
                      action={
                        <WishlistButton
                          tourId={item.tour.id}
                          initialSaved={saved.has(item.tour.id)}
                          isAuthenticated={Boolean(user)}
                          variant="overlay"
                        />
                      }
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </ViewTransition>
      </Container>
    </>
  );
}
