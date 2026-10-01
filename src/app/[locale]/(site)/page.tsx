import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  HandCoins,
  HeartHandshake,
  Quote,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { Magnetic, Marquee, Reveal, SplitWords } from "@/components/motion";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { categoryIcons, tourCategories } from "@/components/shared/category-icon";
import { DestinationCard } from "@/components/shared/destination-card";
import { TourCard } from "@/components/shared/tour-card";
import { HomeHero, type HeroStat } from "@/features/home/components/home-hero";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { getCurrentUser } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { reviewService } from "@/server/services/review.service";
import { tourService } from "@/server/services/tour.service";
import { wishlistService } from "@/server/services/wishlist.service";

const STORY_IMAGE =
  "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1600&q=80&auto=format&fit=crop";
const CTA_IMAGE = "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=2400&q=80";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  return pageMetadata({
    locale,
    path: "/",
    title: `EtnoJourney | ${t("title")}`,
    description: t("description"),
    absoluteTitle: true,
  });
}

const mosaic = [
  "md:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[28rem] lg:min-h-[40rem]",
  "lg:col-span-5 min-h-80",
  "lg:col-span-5 min-h-80",
  "lg:col-span-4 min-h-80",
  "lg:col-span-4 min-h-80",
  "lg:col-span-4 min-h-80",
];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const [t, tc, featured, destinations, reviews, summary, user] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    tourService.featured(6),
    destinationService.listWithTourCount(),
    reviewService.highlights(3),
    reviewService.summary(),
    getCurrentUser(),
  ]);
  const saved = user ? await wishlistService.tourIds(user.id) : new Set<number>();
  // Keep the 3-column grid free of orphan slots.
  const featuredGrid =
    featured.length > 3 ? featured.slice(0, featured.length - (featured.length % 3)) : featured;

  const stats: HeroStat[] = [
    { value: destinations.length, label: t("stats.destinations") },
    { value: summary.tours, label: t("stats.tours") },
    { value: summary.total, label: t("stats.reviews") },
    ...(summary.total
      ? [{ value: Number(summary.average.toFixed(1)), decimals: 1, label: t("stats.rating") }]
      : []),
  ];

  // Ticker: destinations interleaved with experience categories.
  const marqueeItems = destinations.flatMap(({ destination }, i) => {
    const category = tourCategories[i % tourCategories.length];
    return [destination.name, tc(`categories.${category}`)];
  });

  const values = [
    { key: "local", icon: Waypoints },
    { key: "small", icon: UsersRound },
    { key: "fair", icon: HandCoins },
    { key: "respect", icon: HeartHandshake },
  ] as const;

  return (
    <>
      <HomeHero stats={stats} />

      {/* Ticker band */}
      {marqueeItems.length > 0 && (
        <section className="border-line border-b py-8 md:py-10">
          <Marquee duration={55} label={t("marquee.label")}>
            {marqueeItems.map((item, i) => (
              <span key={`${item}-${i}`} className="flex items-center">
                <span
                  className={cn(
                    "font-display px-8 text-4xl whitespace-nowrap italic md:px-12 md:text-6xl",
                    i % 2 === 0 ? "text-ink/80" : "text-muted/70",
                  )}
                >
                  {item}
                </span>
                <KawungMark />
              </span>
            ))}
          </Marquee>
        </section>
      )}

      {/* Categories */}
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <SectionHeading eyebrow={t("categories.eyebrow")} title={t("categories.title")} />
          </Reveal>
          <ul className="border-line bg-line mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border lg:grid-cols-5">
            {tourCategories.map((category, i) => {
              const Icon = categoryIcons[category];
              return (
                <li
                  key={category}
                  className={cn(
                    "bg-sand-50 [&>div]:h-full",
                    // An odd last tile spans the full row on the 2-column mobile grid.
                    i === tourCategories.length - 1 &&
                      tourCategories.length % 2 === 1 &&
                      "col-span-2 lg:col-span-1",
                  )}
                >
                  <Reveal variant="fade" delay={Math.min(i * 0.08, 0.4)}>
                    <Link
                      href={{ pathname: "/tours", query: { category } }}
                      className="group hover:bg-ink hover:text-sand-50 flex h-full flex-col justify-between gap-8 p-5 transition-colors duration-500 md:gap-12 md:p-7"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-display text-muted group-hover:text-sand-300 text-sm">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Icon
                          className="text-terracotta group-hover:text-gold size-7 transition-transform duration-500 group-hover:-translate-y-1"
                          strokeWidth={1.25}
                          aria-hidden
                        />
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <span className="font-display text-xl leading-tight md:text-2xl">
                          {tc(`categories.${category}`)}
                        </span>
                        <ArrowUpRight
                          className="size-5 shrink-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Featured tours */}
      {featured.length > 0 && (
        <section className="grain border-line bg-sand-100 border-y py-24 md:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={t("featured.eyebrow")}
                title={t("featured.title")}
                description={t("featured.description")}
                action={
                  <Button asChild variant="outline">
                    <Link href="/tours">
                      {tc("viewAll")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                }
              />
            </Reveal>
            <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGrid.map((item, i) => (
                <Reveal
                  key={item.tour.id}
                  delay={(i % 3) * 0.08}
                  className={cn(i % 3 === 1 && "lg:mt-16")}
                >
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
          </Container>
        </section>
      )}

      {/* Destinations mosaic */}
      {destinations.length > 0 && (
        <section className="py-24 md:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={t("destinations.eyebrow")}
                title={t("destinations.title")}
                action={
                  <Button asChild variant="outline">
                    <Link href="/destinations">
                      {tc("viewAll")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                }
              />
            </Reveal>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-12">
              {destinations.slice(0, 6).map(({ destination, tourCount }, i) => (
                <Reveal
                  key={destination.id}
                  variant={i % 2 === 0 ? "mask-up" : "mask-left"}
                  delay={Math.min(i * 0.08, 0.4)}
                  className={cn("flex", mosaic[i])}
                >
                  <DestinationCard
                    destination={destination}
                    tourCount={tourCount}
                    eager={i === 0}
                    className="w-full"
                    sizes={
                      i === 0
                        ? "(min-width: 1024px) 58vw, 100vw"
                        : "(min-width: 1024px) 33vw, 100vw"
                    }
                  />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Values */}
      <section className="bg-indigo text-sand-50 relative overflow-hidden py-24 md:py-32">
        <Container className="grid gap-16 lg:grid-cols-12">
          <Reveal variant="none" className="lg:col-span-4">
            <p className="eyebrow text-gold!">{t("values.eyebrow")}</p>
            <SplitWords
              as="h2"
              text={t("values.title")}
              className="mt-4 text-4xl leading-[1.05] md:text-5xl"
            />
          </Reveal>
          <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:col-span-8">
            {values.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={Math.min(i * 0.08, 0.4)}>
                <div className="border-t border-white/15 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-5xl text-white/20">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="text-gold size-7" strokeWidth={1.25} aria-hidden />
                  </div>
                  <h3 className="mt-6 text-2xl">{t(`values.items.${key}.title`)}</h3>
                  <p className="text-sand-100/70 mt-3 leading-relaxed">
                    {t(`values.items.${key}.body`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Editorial story */}
      <section className="py-24 md:py-32">
        <Container className="grid items-center gap-14 lg:grid-cols-12">
          <Reveal variant="mask-left" className="lg:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius-card)">
              <Image
                src={STORY_IMAGE}
                alt={t("story.imageAlt")}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-[2.4s] ease-(--ease-editorial) hover:scale-105"
              />
            </div>
          </Reveal>
          <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8">
            <p className="eyebrow">{t("story.eyebrow")}</p>
            <SplitWords
              as="h2"
              text={t("story.title")}
              delay={0.2}
              className="mt-4 text-4xl leading-[1.05] md:text-5xl"
            />
            <p className="text-ink-soft mt-6 text-lg leading-relaxed">{t("story.body")}</p>
            <figure className="border-terracotta mt-10 border-l-2 pl-6">
              <blockquote className="font-display text-2xl leading-snug italic">
                <span className="sr-only">&ldquo;{t("story.quote")}&rdquo;</span>
                <span aria-hidden>
                  <SplitWords text={`\u201C${t("story.quote")}\u201D`} stagger={35} delay={0.55} />
                </span>
              </blockquote>
              <figcaption className="text-muted mt-3 text-sm">{t("story.quoteAuthor")}</figcaption>
            </figure>
            <Button asChild variant="dark" className="mt-10">
              <Link href="/destinations/ubud">
                {t("story.cta")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section className="grain border-line bg-sand-100 border-y py-24 md:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={t("testimonials.eyebrow")}
                title={t("testimonials.title")}
                align="center"
              />
            </Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {reviews.map(({ review, tour, destination }, i) => (
                <Reveal key={review.id} delay={Math.min(i * 0.08, 0.4)} className="h-full">
                  <figure className="bg-sand-50 flex h-full flex-col rounded-(--radius-card) p-8 shadow-[0_24px_48px_-32px_rgb(29_26_22/0.35)]">
                    <Quote className="text-terracotta size-8" strokeWidth={1.25} aria-hidden />
                    <p className="font-display mt-6 flex-1 text-xl leading-snug">
                      {localize(review.body, locale)}
                    </p>
                    <Stars value={review.rating} className="mt-6" />
                    <div className="border-line mt-4 border-t pt-4 text-sm">
                      <p className="font-semibold">
                        {review.authorName}
                        <span className="text-muted font-normal"> &middot; {review.country}</span>
                      </p>
                      <Link
                        href={`/tours/${tour.slug}`}
                        className="text-muted hover:text-terracotta mt-1 block"
                      >
                        {localize(tour.title, locale)}, {destination}
                      </Link>
                    </div>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* CTA band */}
      <section className="p-3 md:p-5">
        <div className="bg-indigo relative overflow-hidden rounded-[2rem] text-white">
          <Reveal variant="mask-up" className="absolute inset-0">
            <Image src={CTA_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
          </Reveal>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          <Container className="relative py-24 md:py-36">
            <Reveal variant="none" className="max-w-2xl">
              <SplitWords
                as="h2"
                text={t("cta.title")}
                delay={0.3}
                className="text-4xl leading-[1.02] md:text-6xl"
              />
              <Reveal delay={0.5}>
                <p className="mt-6 text-lg leading-relaxed text-white/85">{t("cta.description")}</p>
              </Reveal>
              <Reveal delay={0.6} className="mt-10 flex flex-wrap gap-3">
                <Magnetic>
                  <Button asChild size="lg">
                    <Link href="/tours">
                      {t("cta.primary")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </Magnetic>
                {!user && (
                  <Button asChild size="lg" variant="glass">
                    <Link href="/register">{t("cta.secondary")}</Link>
                  </Button>
                )}
              </Reveal>
            </Reveal>
          </Container>
        </div>
      </section>
    </>
  );
}

/** Small kawung (batik) mark used as the ticker separator. */
function KawungMark() {
  return (
    <svg viewBox="0 0 20 20" className="text-terracotta/70 size-5 shrink-0" aria-hidden>
      <g fill="currentColor">
        <ellipse cx="10" cy="5" rx="2.2" ry="3.4" />
        <ellipse cx="10" cy="15" rx="2.2" ry="3.4" />
        <ellipse cx="5" cy="10" rx="3.4" ry="2.2" />
        <ellipse cx="15" cy="10" rx="3.4" ry="2.2" />
      </g>
    </svg>
  );
}
