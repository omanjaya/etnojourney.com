import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const ogLocale: Record<Locale, string> = { id: "id_ID", en: "en_US" };

/** Public base URL of the site, without a trailing slash. */
export function siteUrl(): string {
  const url = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** Absolute URL for a locale-agnostic path, e.g. `/tours/abc` in `en`. */
export function localizedUrl(path: string, locale: Locale): string {
  return siteUrl() + getPathname({ href: path, locale });
}

/** Default social image rendered by `app/[locale]/opengraph-image.tsx`. */
function defaultImage(locale: Locale): string {
  return `${siteUrl()}${locale === routing.defaultLocale ? "" : `/${locale}`}/opengraph-image`;
}

/**
 * Builds consistent page metadata: canonical + hreflang alternates for every
 * locale, Open Graph and Twitter cards. `path` is the unprefixed route, e.g. `/tours`.
 */
export async function pageMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
}): Promise<Metadata> {
  const { locale, path, title, description, image, absoluteTitle = false, noIndex = false } = opts;
  const canonical = localizedUrl(path, locale);
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(path, l)]));
  const ogImage = image ?? defaultImage(locale);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, "x-default": localizedUrl(path, routing.defaultLocale) },
    },
    openGraph: {
      type: "website",
      siteName: "EtnoJourney",
      url: canonical,
      title,
      description,
      locale: ogLocale[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
