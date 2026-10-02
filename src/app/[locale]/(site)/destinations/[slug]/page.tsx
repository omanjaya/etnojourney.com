import type { Metadata } from "next";
import Image from "next/image";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Compass, MapPin, Route } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { provinceLabel } from "@/lib/provinces";
import { localizedUrl, pageMetadata, siteUrl } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonLd } from "@/components/shared/json-ld";
import { Reveal } from "@/components/shared/reveal";
import { destinationMorphName } from "@/components/shared/destination-card";
import { TourCard } from "@/components/shared/tour-card";
import { SplitWords } from "@/components/motion";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { getCurrentUser } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { wishlistService } from "@/server/services/wishlist.service";
import { PhotoCredit } from "@/components/shared/photo-credit";
import { photoCreditService } from "@/server/services/photo-credit.service";

function absoluteImage(src: string): string {
  return src.startsWith("/") ? `${siteUrl()}${src}` : src;
}

async function load(slug: string) {
  try {
    return await destinationService.getWithTours(slug);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/destinations/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const data = await destinationService.getWithTours(slug).catch(() => null);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "destinations.meta" });
  return pageMetadata({
    locale,
    path: `/destinations/${data.destination.slug}`,
    title: t("detailTitle", {
      name: data.destination.name,
      province: provinceLabel(data.destination.province, locale),
    }),
    description: localize(data.destination.tagline, locale),
    image: absoluteImage(data.destination.heroImage),
  });
}

export default async function DestinationPage({
  params,
}: PageProps<"/[locale]/destinations/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const { destination, tours } = await load(slug);
  const [t, user, credits] = await Promise.all([
    getTranslations("destinations.detail"),
    getCurrentUser(),
    photoCreditService.forImages([destination.heroImage]),
  ]);
  const saved = user ? await wishlistService.tourIds(user.id) : new Set<number>();
  const url = localizedUrl(`/destinations/${destination.slug}`, locale);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TouristDestination",
            name: destination.name,
            description: localize(destination.tagline, locale),
            url,
            image: absoluteImage(destination.heroImage),
            containedInPlace: { "@type": "AdministrativeArea", name: destination.province },
            includesAttraction: tours.map(({ tour }) => ({
              "@type": "TouristTrip",
              name: localize(tour.title, locale),
              url: localizedUrl(`/tours/${tour.slug}`, locale),
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { name: t("breadcrumbHome"), item: siteUrl() + getPathname({ href: "/", locale }) },
              { name: t("allDestinations"), item: localizedUrl("/destinations", locale) },
              { name: destination.name, item: url },
            ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
          },
        ]}
      />
      {/* Shorter on laptops so the destination's tours start near the first screen. */}
      <section className="bg-indigo short:min-h-[50vh] relative flex min-h-[70vh] items-end overflow-hidden text-white md:min-h-[60vh] lg:min-h-[min(60vh,560px)]">
        <ViewTransition name={destinationMorphName(destination.slug)} share="morph" default="none">
          {/* Small cached copy underneath so the morph never shows an empty box
              while the full-size hero is still loading. */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(/_next/image?url=${encodeURIComponent(destination.heroImage)}&w=640&q=75)`,
            }}
          >
            <Image
              src={destination.heroImage}
              alt={destination.name}
              fill
              preload
              fetchPriority="high"
              sizes="100vw"
              className="animate-ken-burns object-cover"
            />
          </div>
        </ViewTransition>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />
        <Container className="short:pt-24 short:pb-9 relative pt-32 pb-12 md:pb-14">
          <Link
            href="/destinations"
            className="group/back animate-fade-in short:mb-4 mb-6 inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft
              className="size-4 transition-transform duration-500 ease-(--ease-editorial) group-hover/back:-translate-x-1"
              aria-hidden
            />
            {t("allDestinations")}
          </Link>
          <p className="animate-fade-up flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-white/75 uppercase [animation-delay:0.15s]">
            <MapPin className="size-4" aria-hidden />
            {t("eyebrow", { province: provinceLabel(destination.province, locale) })}
          </p>
          <SplitWords
            as="h1"
            text={destination.name}
            play="load"
            delay={0.25}
            stagger={90}
            className="short:mt-3 short:text-6xl mt-4 text-6xl leading-none md:text-7xl xl:text-8xl"
          />
          <p className="font-display animate-fade-up short:mt-3 short:text-lg mt-5 max-w-2xl text-xl leading-relaxed text-balance text-white/85 italic [animation-delay:0.55s]">
            {localize(destination.tagline, locale)}
          </p>
          <PhotoCredit
            credit={credits.get(destination.heroImage)}
            className="short:mt-4 mt-6 text-white/60 [&_a]:text-white/75"
          />
        </Container>
      </section>

      {/* Tours first: they are what visitors come here for. */}
      <section className="grain border-line bg-sand-100 short:py-10 border-b py-12 md:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="short:text-3xl text-3xl md:text-4xl xl:text-5xl">
              {t("tours", { name: destination.name })}
            </h2>
            <p className="text-muted text-sm">{t("toursCount", { count: tours.length })}</p>
          </div>

          {tours.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={Compass}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button asChild variant="outline">
                  <Link href="/tours">{t("browseTours")}</Link>
                </Button>
              }
            />
          ) : (
            <div className="short:mt-6 mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((item, i) => (
                <Reveal key={item.tour.id} delay={Math.min((i % 3) * 0.1, 0.4)}>
                  <TourCard
                    data={item}
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
        </Container>
      </section>
      <Container className="grid gap-10 py-16 md:grid-cols-12 md:py-20">
        <Reveal variant="none" className="md:col-span-4">
          <SplitWords
            as="h2"
            text={t("about", { name: destination.name })}
            className="text-3xl md:text-4xl"
          />
        </Reveal>
        <Reveal
          delay={0.15}
          className="text-ink-soft space-y-5 text-lg leading-relaxed whitespace-pre-line md:col-span-7 md:col-start-6"
        >
          {localize(destination.description, locale)}
        </Reveal>
        {destination.gettingThere && (
          <Reveal
            delay={0.2}
            className="bg-sand-100 rounded-(--radius-card) p-6 md:col-span-7 md:col-start-6 md:p-8"
          >
            <h3 className="flex items-center gap-3 font-sans text-base font-semibold">
              <Route className="text-terracotta size-5" strokeWidth={1.5} aria-hidden />
              {t("gettingThere")}
            </h3>
            <p className="text-ink-soft mt-4 leading-relaxed">
              {localize(destination.gettingThere, locale)}
            </p>
          </Reveal>
        )}
      </Container>
    </>
  );
}
