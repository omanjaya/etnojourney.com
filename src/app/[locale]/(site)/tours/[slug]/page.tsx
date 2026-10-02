import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Backpack,
  Check,
  ChevronRight,
  CircleMinus,
  Clock,
  ExternalLink,
  HeartHandshake,
  Languages,
  MapPin,
  Mountain,
  PenLine,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize, type LocalizedText } from "@/lib/i18n-text";
import { provinceLabel } from "@/lib/provinces";
import { localizedUrl, pageMetadata, siteUrl } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { categoryIcons } from "@/components/shared/category-icon";
import { JsonLd } from "@/components/shared/json-ld";
import { Reveal } from "@/components/shared/reveal";
import { TourCard, tourMorphName } from "@/components/shared/tour-card";
import { BookingPanel } from "@/features/booking/components/booking-panel";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import "@/features/tours/view-transitions.css";
import { ItineraryTimeline } from "@/features/tours/components/itinerary-timeline";
import { MobileBookingBar } from "@/features/tours/components/mobile-booking-bar";
import { ReviewList } from "@/features/tours/components/review-list";
import { TourGallery } from "@/features/tours/components/tour-gallery";
import { getCurrentUser } from "@/server/auth/guards";
import { isDomainError } from "@/server/services/errors";
import { tourService } from "@/server/services/tour.service";
import { wishlistService } from "@/server/services/wishlist.service";
import { toCreditMap } from "@/components/shared/photo-credit";
import { photoCreditService } from "@/server/services/photo-credit.service";
import { siteContact } from "@/config/site";

type DetailTour = Awaited<ReturnType<typeof tourService.getPublishedBySlug>>;

/** Absolute, social-card sized URL for a tour or destination image. */
function socialImage(src: string): string {
  if (src.startsWith("/")) return `${siteUrl()}${src}`;
  const url = new URL(src);
  url.searchParams.set("w", "1200");
  url.searchParams.set("h", "630");
  url.searchParams.set("fit", "crop");
  return url.toString();
}

function tourJsonLd(tour: DetailTour, locale: Locale, labels: { home: string; tours: string }) {
  const url = localizedUrl(`/tours/${tour.slug}`, locale);
  const title = localize(tour.title, locale);
  const agency = { "@type": "TravelAgency", name: "EtnoJourney", url: siteUrl() };
  return [
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: title,
      description: localize(tour.summary, locale),
      url,
      image: [tour.coverImage, ...tour.gallery].map(socialImage),
      touristType: "Cultural tourism",
      provider: agency,
      offers: {
        "@type": "Offer",
        price: tour.pricePerPerson,
        priceCurrency: "IDR",
        availability: "https://schema.org/InStock",
        url,
        seller: agency,
      },
      ...(tour.reviewCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: tour.rating,
              reviewCount: tour.reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      itinerary: {
        "@type": "ItemList",
        itemListElement: tour.itinerary.map((day) => ({
          "@type": "ListItem",
          position: day.day,
          name: localize(day.title, locale),
          description: localize(day.description, locale),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: labels.home, item: siteUrl() + getPathname({ href: "/", locale }) },
        { name: labels.tours, item: localizedUrl("/tours", locale) },
        { name: title, item: url },
      ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
    },
  ];
}

/** `?date=YYYY-MM-DD&people=N` carried through sign-in; invalid values are ignored. */
function bookingPrefill(
  search: Record<string, string | string[] | undefined>,
  maxParticipants: number,
): { initialDate?: string; initialParticipants?: number } {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const date = first(search.date);
  const people = Number(first(search.people));
  const validDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      ? date
      : undefined;
  const validPeople =
    Number.isInteger(people) && people >= 1 && people <= maxParticipants ? people : undefined;
  return { initialDate: validDate, initialParticipants: validPeople };
}

const mapsUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

async function loadTour(slug: string) {
  try {
    return await tourService.getPublishedBySlug(slug);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tours/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const tour = await tourService.getPublishedBySlug(slug).catch(() => null);
  if (!tour) return {};
  return pageMetadata({
    locale,
    path: `/tours/${tour.slug}`,
    title: localize(tour.title, locale),
    description: localize(tour.summary, locale),
    image: socialImage(tour.coverImage),
  });
}

export default async function TourDetailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tours/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const tour = await loadTour(slug);
  const [t, td, tc, tr, user, related] = await Promise.all([
    getTranslations("tours.detail"),
    getTranslations("tours.difficulty"),
    getTranslations("common"),
    getTranslations("reviews"),
    getCurrentUser(),
    tourService.related(tour.id, tour.destinationId),
  ]);
  const title = localize(tour.title, locale);
  const CategoryIcon = categoryIcons[tour.category];
  const images = [tour.coverImage, ...tour.gallery.filter((g) => g !== tour.coverImage)];
  const [saved, credits] = await Promise.all([
    user ? wishlistService.tourIds(user.id).then((ids) => ids.has(tour.id)) : false,
    photoCreditService.forImages(images),
  ]);

  const facts = [
    { icon: Clock, label: t("duration"), value: tc("days", { count: tour.durationDays }) },
    {
      icon: Users,
      label: t("groupSize"),
      value: t("groupSizeValue", { count: tour.maxParticipants }),
    },
    { icon: CategoryIcon, label: t("category"), value: tc(`categories.${tour.category}`) },
    {
      icon: Mountain,
      label: t("difficulty"),
      value: td(tour.difficulty),
      hint: td(`${tour.difficulty}Hint`),
    },
    { icon: Languages, label: t("language"), value: t("languageValue") },
  ];

  const prefill = bookingPrefill(await searchParams, tour.maxParticipants);
  const contactEmail = siteContact().email ?? undefined;
  const notIncluded: LocalizedText[] = tour.notIncluded.length
    ? tour.notIncluded
    : (["transport", "personal", "tips"] as const).map((key) => {
        const text = t(`notIncludedDefault.${key}`);
        return { id: text, en: text };
      });
  const gettingThere = tour.destination.gettingThere;

  return (
    <article className="pt-28 pb-24 md:pt-32 lg:pb-0">
      <JsonLd
        data={tourJsonLd(tour, locale, { home: t("breadcrumbHome"), tours: t("breadcrumbTours") })}
      />
      <Container>
        <nav aria-label="Breadcrumb" className="text-muted mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink inline-flex min-h-10 items-center">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link href="/tours" className="hover:text-ink inline-flex min-h-10 items-center">
                {t("breadcrumbTours")}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link
                href={`/destinations/${tour.destination.slug}`}
                className="hover:text-ink inline-flex min-h-10 items-center"
              >
                {tour.destination.name}
              </Link>
            </li>
          </ol>
        </nav>

        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="terracotta">
                <CategoryIcon aria-hidden />
                {tc(`categories.${tour.category}`)}
              </Badge>
              {tour.reviewCount > 0 && (
                <Rating
                  value={tour.rating}
                  count={tour.reviewCount}
                  label={tc("ratingLabel", { rating: tour.rating.toFixed(1) })}
                />
              )}
            </div>
            <h1 className="mt-5 text-4xl leading-[1.05] md:text-6xl">{title}</h1>
            <p className="text-ink-soft mt-4 flex items-center gap-2">
              <MapPin className="text-terracotta size-4" aria-hidden />
              {tour.destination.name}, {provinceLabel(tour.destination.province, locale)}
            </p>
          </div>
          <WishlistButton
            tourId={tour.id}
            initialSaved={saved}
            isAuthenticated={Boolean(user)}
            variant="inline"
          />
        </header>

        <div className="mt-10">
          <TourGallery
            images={images}
            alt={title}
            morphName={tourMorphName(tour.slug)}
            credits={toCreditMap(credits)}
          />
        </div>
      </Container>

      <Container className="mt-14 grid gap-14 pb-24 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
        <div className="min-w-0 space-y-20">
          <dl className="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border sm:grid-cols-3 xl:grid-cols-5">
            {facts.map(({ icon: Icon, label, value, hint }, i) => (
              <div
                key={label}
                className="group/fact bg-sand-50 animate-fade-up p-5 transition-colors duration-500 hover:bg-white"
                style={{ animationDelay: `${0.3 + i * 0.08}s` }}
              >
                <Icon
                  className="text-terracotta size-5 transition-transform duration-500 ease-(--ease-editorial) group-hover/fact:-translate-y-0.5 group-hover/fact:scale-110"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <dt className="text-muted mt-3 text-xs tracking-wide uppercase">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
                {hint && <dd className="text-muted mt-1 text-xs leading-snug">{hint}</dd>}
              </div>
            ))}
          </dl>

          <section aria-labelledby="overview">
            <h2 id="overview" className="text-3xl md:text-4xl">
              {t("overview")}
            </h2>
            <p className="text-ink first-letter:font-display first-letter:text-terracotta mt-6 text-xl leading-relaxed first-letter:float-left first-letter:mt-1 first-letter:mr-1.5 first-letter:text-7xl first-letter:leading-[0.85]">
              {localize(tour.summary, locale)}
            </p>
            <div className="text-ink-soft mt-6 space-y-4 leading-relaxed whitespace-pre-line">
              {localize(tour.description, locale)}
            </div>
            <p className="text-muted mt-6 text-sm italic">
              {t("hostedBy", { destination: tour.destination.name })}
            </p>
          </section>

          {tour.highlights.length > 0 && (
            <section aria-labelledby="highlights">
              <h2 id="highlights" className="text-3xl md:text-4xl">
                {t("highlights")}
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {tour.highlights.map((h, i) => (
                  <li key={i} className="flex">
                    <Reveal
                      variant="scale"
                      delay={Math.min(i * 0.08, 0.4)}
                      className="group/hl bg-sand-100 hover:bg-gold-light flex w-full gap-4 rounded-(--radius-card) p-5 transition-colors duration-500"
                    >
                      <Sparkles
                        className="text-gold mt-0.5 size-5 shrink-0 transition-transform duration-700 ease-(--ease-editorial) group-hover/hl:rotate-12"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="leading-relaxed">{localize(h, locale)}</span>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tour.itinerary.length > 0 && (
            <section aria-labelledby="itinerary">
              <h2 id="itinerary" className="mb-10 text-3xl md:text-4xl">
                {t("itinerary")}
              </h2>
              <div className="pl-4">
                <ItineraryTimeline days={tour.itinerary} locale={locale} />
              </div>
            </section>
          )}

          <section aria-labelledby="included" className="grid gap-10 md:grid-cols-2">
            <Reveal>
              <h2 id="included" className="text-2xl md:text-3xl">
                {t("included")}
              </h2>
              <ul className="mt-6 space-y-3">
                {tour.included.map((item, i) => (
                  <li key={i} className="text-ink-soft flex gap-3">
                    <Check className="text-leaf mt-0.5 size-5 shrink-0" aria-hidden />
                    {localize(item, locale)}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 id="not-included" className="text-2xl md:text-3xl">
                {t("notIncluded")}
              </h2>
              <ul className="mt-6 space-y-3">
                {notIncluded.map((item, i) => (
                  <li key={i} className="text-ink-soft flex gap-3">
                    <CircleMinus className="text-muted mt-0.5 size-5 shrink-0" aria-hidden />
                    {localize(item, locale)}
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          <section aria-labelledby="before-you-go">
            <h2 id="before-you-go" className="text-3xl md:text-4xl">
              {t("beforeYouGo")}
            </h2>
            <p className="text-ink-soft mt-4 max-w-2xl leading-relaxed">{t("beforeYouGoIntro")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {tour.whatToBring.length > 0 && (
                <Reveal className="bg-sand-100 rounded-(--radius-card) p-6">
                  <h3 className="flex items-center gap-3 font-sans text-base font-semibold">
                    <Backpack className="text-terracotta size-5" strokeWidth={1.5} aria-hidden />
                    {t("whatToBring")}
                  </h3>
                  <ul className="text-ink-soft marker:text-sand-300 mt-4 list-disc space-y-2 pl-5">
                    {tour.whatToBring.map((item, i) => (
                      <li key={i}>{localize(item, locale)}</li>
                    ))}
                  </ul>
                </Reveal>
              )}
              {tour.etiquette.length > 0 && (
                <Reveal delay={0.08} className="bg-sand-100 rounded-(--radius-card) p-6">
                  <h3 className="flex items-center gap-3 font-sans text-base font-semibold">
                    <HeartHandshake
                      className="text-terracotta size-5"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    {t("etiquette")}
                  </h3>
                  <ul className="text-ink-soft marker:text-sand-300 mt-4 list-disc space-y-2 pl-5">
                    {tour.etiquette.map((item, i) => (
                      <li key={i}>{localize(item, locale)}</li>
                    ))}
                  </ul>
                </Reveal>
              )}
              {gettingThere && (
                <Reveal delay={0.12} className="bg-sand-100 rounded-(--radius-card) p-6">
                  <h3 className="flex items-center gap-3 font-sans text-base font-semibold">
                    <Route className="text-terracotta size-5" strokeWidth={1.5} aria-hidden />
                    {t("gettingThere")}
                  </h3>
                  <p className="text-ink-soft mt-4 leading-relaxed">
                    {localize(gettingThere, locale)}
                  </p>
                </Reveal>
              )}
              <Reveal delay={0.16} className="bg-sand-100 rounded-(--radius-card) p-6">
                <h3 className="flex items-center gap-3 font-sans text-base font-semibold">
                  <MapPin className="text-terracotta size-5" strokeWidth={1.5} aria-hidden />
                  {t("meetingPoint")}
                </h3>
                <p className="text-ink-soft mt-4 leading-relaxed">{tour.meetingPoint}</p>
                <a
                  href={mapsUrl(tour.meetingPoint)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terracotta-dark hover:text-terracotta mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium"
                >
                  {t("openInMaps")}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </Reveal>
            </div>
          </section>

          <section aria-labelledby="reviews">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="reviews" className="text-3xl md:text-4xl">
                {t("reviews")}
              </h2>
              {tour.reviewCount > 0 && (
                <p className="text-muted text-sm">
                  {t("reviewsSummary", { rating: tour.rating.toFixed(1), count: tour.reviewCount })}
                </p>
              )}
            </div>
            {tour.reviews.length > 0 ? (
              <div className="mt-8">
                <ReviewList reviews={tour.reviews} locale={locale} />
              </div>
            ) : (
              <p className="text-muted mt-6">{t("noReviews")}</p>
            )}
            <p className="text-muted mt-6 flex items-start gap-2 text-sm">
              <PenLine className="text-terracotta mt-0.5 size-4 shrink-0" aria-hidden />
              {tr("tourNote")}
            </p>
          </section>
        </div>

        <aside id="booking" className="scroll-mt-24 lg:sticky lg:top-28 lg:self-start">
          <div className="ej-glide-in">
            <BookingPanel
              tour={{
                id: tour.id,
                slug: tour.slug,
                pricePerPerson: tour.pricePerPerson,
                maxParticipants: tour.maxParticipants,
                durationDays: tour.durationDays,
              }}
              isAuthenticated={Boolean(user)}
              defaultContactName={user?.name}
              initialDate={prefill.initialDate}
              initialParticipants={prefill.initialParticipants}
              contactEmail={contactEmail}
            />
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <section className="grain border-line bg-sand-100 border-t py-20 md:py-28">
          <Container>
            <h2 className="text-3xl md:text-4xl">{t("related")}</h2>
            <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, i) => (
                <Reveal key={item.tour.id} variant="mask-up" delay={Math.min(i * 0.12, 0.4)}>
                  <TourCard data={item} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <MobileBookingBar pricePerPerson={tour.pricePerPerson} />
    </article>
  );
}
