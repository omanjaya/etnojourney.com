import Image from "next/image";
import { ViewTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Clock, MapPin, Mountain, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { provinceLabel } from "@/lib/provinces";
import { cn } from "@/lib/utils";
import type { Destination, Tour } from "@/server/db/schema";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Tilt } from "@/components/motion";
import { categoryIcons } from "./category-icon";
import "@/features/tours/view-transitions.css";

/** View transition name shared by a tour's card image and its detail hero. */
export const tourMorphName = (slug: string) => `tour-${slug}`;

export type TourCardData = { tour: Tour; destination: Destination };

export function TourCard({
  data: { tour, destination },
  priority = false,
  headingLevel: Heading = "h3",
  className,
  action,
  morph = true,
}: {
  data: TourCardData;
  /** Above-the-fold card: fetched eagerly with high priority (Next 16 replaces `priority`). */
  priority?: boolean;
  /** Use "h2" when the card sits directly under the page h1. */
  headingLevel?: "h2" | "h3";
  className?: string;
  /** Optional overlay control, e.g. a wishlist button. */
  action?: React.ReactNode;
  /**
   * Morph this card's image into the tour page hero on navigation. Pass
   * `false` when the same tour can appear twice on one page: view transition
   * names must be unique per document.
   */
  morph?: boolean;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const td = useTranslations("tours.difficulty");
  const CategoryIcon = categoryIcons[tour.category];

  return (
    <article className={cn("group relative flex h-full flex-col", className)}>
      {/* z-[1] keeps the image area (and its overlay controls) above the
          title link's full-card hit area, despite Tilt's stacking context. */}
      <Tilt max={3} className="relative z-[1] rounded-(--radius-card)">
        <div className="bg-sand-200 relative aspect-[4/5] overflow-hidden rounded-(--radius-card)">
          <ViewTransition
            name={morph ? tourMorphName(tour.slug) : undefined}
            share={morph ? "morph" : undefined}
            default="none"
          >
            <Image
              src={tour.coverImage}
              alt={localize(tour.title, locale)}
              fill
              {...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : {})}
              sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[1.4s] ease-(--ease-editorial) group-hover:scale-[1.06]"
            />
          </ViewTransition>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 transition-opacity duration-700 group-hover:opacity-80" />
          {/* Soft light sweep across the photo on hover. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.16)_50%,transparent_65%)] transition-transform duration-[1.1s] ease-(--ease-editorial) group-hover:translate-x-full"
          />
          {/* The image area also leads to the tour; the title link is the accessible one. */}
          <Link
            href={`/tours/${tour.slug}`}
            aria-hidden
            tabIndex={-1}
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-2 *:pointer-events-auto">
            <Badge tone="glass">
              <CategoryIcon aria-hidden />
              {t(`categories.${tour.category}`)}
            </Badge>
            {action}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between text-white">
            {tour.reviewCount > 0 ? (
              <Rating
                value={tour.rating}
                count={tour.reviewCount}
                label={t("ratingLabel", { rating: tour.rating.toFixed(1) })}
              />
            ) : (
              <Badge tone="glass">{t("newTour")}</Badge>
            )}
            <span className="text-ink grid size-10 translate-y-2 place-items-center rounded-full bg-white opacity-0 transition-all duration-500 ease-(--ease-editorial) group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowUpRight
                className="size-4 transition-transform duration-500 ease-(--ease-editorial) group-hover:rotate-45"
                aria-hidden
              />
            </span>
          </div>
        </div>
      </Tilt>

      {/* Fixed rhythm so cards in a row line up: one-line location, a title
          that always takes two lines, one meta line, price pinned to the bottom. */}
      <div className="flex flex-1 flex-col pt-5">
        <p className="text-muted flex min-w-0 items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {destination.name}, {provinceLabel(destination.province, locale)}
          </span>
        </p>
        <Heading
          title={localize(tour.title, locale)}
          className="mt-2 line-clamp-2 min-h-[2lh] text-xl leading-snug md:text-2xl"
        >
          <Link
            href={`/tours/${tour.slug}`}
            className="decoration-terracotta/40 group-hover:text-terracotta-dark underline-offset-4 transition-colors duration-300 after:absolute after:inset-0"
          >
            {localize(tour.title, locale)}
          </Link>
        </Heading>
        <div className="text-ink-soft mt-3 flex min-w-0 items-center gap-x-4 overflow-hidden text-sm whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="text-muted size-4" aria-hidden />
            {t("days", { count: tour.durationDays })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="text-muted size-4" aria-hidden />
            {t("maxPeople", { count: tour.maxParticipants })}
          </span>
          {/* Only flag effort when it matters; easy tours keep the card clean. */}
          {tour.difficulty !== "easy" && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                tour.difficulty === "challenging" && "text-terracotta-dark",
              )}
            >
              <Mountain className="size-4 opacity-70" aria-hidden />
              {td(tour.difficulty)}
            </span>
          )}
        </div>
        <div className="mt-auto pt-4">
          <p className="border-line flex items-baseline justify-between gap-4 border-t pt-3">
            <span className="text-muted text-[11px] font-medium tracking-wide uppercase">{t("from")}</span>
            <span className="inline-block transition-transform duration-500 ease-(--ease-editorial) group-hover:-translate-y-0.5">
              <span className="font-semibold">{formatCurrency(tour.pricePerPerson, locale)}</span>
              <span className="text-muted text-sm"> {t("perPerson")}</span>
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
