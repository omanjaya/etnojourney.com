import Image from "next/image";
import { ViewTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import type { Destination } from "@/server/db/schema";
import "@/features/tours/view-transitions.css";

/** View transition name shared by a destination's card image and its page hero. */
export const destinationMorphName = (slug: string) => `destination-${slug}`;

export function DestinationCard({
  destination,
  tourCount,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  eager = false,
  headingLevel: Heading = "h3",
  morph = true,
}: {
  destination: Destination;
  tourCount: number;
  className?: string;
  sizes?: string;
  /** Above-the-fold card: fetched eagerly with high priority. */
  eager?: boolean;
  /** Use "h2" when the card sits directly under the page h1. */
  headingLevel?: "h2" | "h3";
  /** Morph the image into the destination hero; `false` if it can appear twice on a page. */
  morph?: boolean;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={cn(
        "group bg-indigo relative block min-h-80 overflow-hidden rounded-(--radius-card)",
        className,
      )}
    >
      <ViewTransition
        name={morph ? destinationMorphName(destination.slug) : undefined}
        share={morph ? "morph" : undefined}
        default="none"
      >
        <Image
          src={destination.heroImage}
          alt={destination.name}
          fill
          sizes={sizes}
          {...(eager ? { fetchPriority: "high" as const, loading: "eager" as const } : {})}
          className="object-cover opacity-90 transition-[scale,opacity] duration-[2.2s] ease-(--ease-editorial) group-hover:scale-110 group-hover:opacity-100"
        />
      </ViewTransition>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity duration-700 group-hover:from-black/85" />
      <div className="absolute inset-x-6 bottom-6 translate-y-3 text-white transition-transform duration-700 ease-(--ease-editorial) group-hover:translate-y-0 group-focus-visible:translate-y-0">
        <p className="text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
          {destination.province}
        </p>
        <Heading className="mt-2 text-3xl">{destination.name}</Heading>
        <p className="mt-2 line-clamp-2 max-w-sm text-sm text-white/80 transition-colors duration-500 group-hover:text-white">
          {localize(destination.tagline, locale)}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
          {t("tourCount", { count: tourCount })}
          <ArrowRight
            className="size-4 transition-transform duration-500 group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
