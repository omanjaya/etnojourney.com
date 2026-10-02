import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Compass } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { groupByIsland } from "@/lib/regions";
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
  searchParams,
}: PageProps<"/[locale]/tours">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const page = parsePage((await searchParams).page);
  const t = await getTranslations({ locale, namespace: "tours.meta" });
  const title = page > 1 ? t("titlePaged", { page }) : t("title");
  const metadata = await pageMetadata({
    locale,
    path: "/tours",
    title,
    description: page > 1 ? t("descriptionPaged", { page }) : t("description"),
  });
  return page > 1 ? withPageParam(metadata, page) : metadata;
}

/** Later pages are distinct documents: their canonical and hreflang carry `?page=`. */
function withPageParam(metadata: Metadata, page: number): Metadata {
  const add = (url: unknown) => (typeof url === "string" ? `${url}?page=${page}` : url);
  const languages = metadata.alternates?.languages as Record<string, string> | undefined;
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: add(metadata.alternates?.canonical) as string,
      languages: languages
        ? Object.fromEntries(Object.entries(languages).map(([k, v]) => [k, add(v) as string]))
        : undefined,
    },
    openGraph: { ...metadata.openGraph, url: add(metadata.openGraph?.url) as string },
  };
}

export default async function ToursPage({ params, searchParams }: PageProps<"/[locale]/tours">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const rawParams = await searchParams;
  const search = parseTourSearch(rawParams);
  const requestedPage = parsePage(rawParams.page);
  const [t, tIslands, result, destinations, user] = await Promise.all([
    getTranslations("tours.list"),
    getTranslations("common.islands"),
    tourService.searchPage(toTourFilters(search), requestedPage, PAGE_SIZE.publicTours),
    destinationService.list(),
    getCurrentUser(),
  ]);
  // Out-of-range pages redirect to the last real page, so each URL has a
  // canonical that matches its content (no duplicate "?page=99" documents).
  if (result.page !== requestedPage) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(rawParams)) {
      if (key === "page" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) query.append(key, v);
    }
    if (result.page > 1) query.set("page", String(result.page));
    const qs = query.toString();
    redirect({ href: qs ? `/tours?${qs}` : "/tours", locale: locale as Locale });
  }
  const saved = user ? await wishlistService.tourIds(user.id) : new Set<number>();
  // A new key per filter combination makes React treat old and new results as
  // an exit/enter pair, so filtering crossfades instead of snapping.
  const resultsKey = JSON.stringify({ ...search, page: result.page });
  const results = result.items;
  const firstIndex = (result.page - 1) * result.pageSize;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <Container className="py-12 md:py-16">
        <TourFilters
          search={search}
          destinations={groupByIsland(destinations, (d) => d.province).flatMap(
            ({ island, items }) =>
              items.map((d) => ({ slug: d.slug, name: d.name, group: tIslands(island) })),
          )}
        />

        <h2 className="sr-only">{t("resultsHeading")}</h2>
        {/* Outside the keyed block so the live region persists and announces changes. */}
        <p className="text-muted mt-10 text-sm" aria-live="polite">
          {t("results", { count: result.total })}
          {result.pageCount > 1 && (
            <span>
              {" "}
              &middot;{" "}
              {t("pageOf", {
                from: firstIndex + 1,
                to: firstIndex + results.length,
                page: result.page,
                pageCount: result.pageCount,
              })}
            </span>
          )}
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
                      priority={result.page === 1 && i < 3}
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

        <Pagination
          className="mt-16"
          pathname="/tours"
          query={{
            q: search.q,
            category: search.category,
            destination: search.destination,
            maxPrice: search.maxPrice,
            maxDays: search.maxDays,
            sort: search.sort,
          }}
          page={result.page}
          pageCount={result.pageCount}
          labels={{
            nav: t("pagination.label"),
            previous: t("pagination.previous"),
            next: t("pagination.next"),
            page: (page) => t("pagination.page", { page }),
          }}
        />
      </Container>
    </>
  );
}
