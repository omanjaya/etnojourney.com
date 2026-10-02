import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";
import { destinationService } from "@/server/services/destination.service";
import { tourService } from "@/server/services/tour.service";

export const dynamic = "force-dynamic";

/** Static editorial and legal pages. */
const CONTENT_PAGES = ["/about", "/faq", "/cancellation-policy", "/privacy", "/terms", "/credits"] as const;

function entry(href: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const url = (locale: (typeof routing.locales)[number]) => localizedUrl(href, locale);
  return {
    url: url(routing.defaultLocale),
    lastModified,
    alternates: {
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
        "x-default": url(routing.defaultLocale),
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tours, destinations] = await Promise.all([
    tourService.search({}),
    destinationService.list(),
  ]);
  return [
    entry("/"),
    entry("/tours"),
    entry("/destinations"),
    ...CONTENT_PAGES.map((href) => entry(href)),
    ...tours.map(({ tour }) => entry(`/tours/${tour.slug}`, tour.updatedAt)),
    ...destinations.map((d) => entry(`/destinations/${d.slug}`, d.updatedAt)),
  ];
}
