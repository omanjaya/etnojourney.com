import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { localizedUrl, siteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { ImageFadeIn } from "@/components/motion/image-fade-in";
import { siteContact } from "@/config/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "id", namespace: "common" });
  // Canonical and hreflang alternates are page-specific: see `pageMetadata` in `@/lib/seo`.
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `EtnoJourney | ${t("tagline")}`, template: "%s | EtnoJourney" },
    description: t("footer.about"),
    openGraph: {
      siteName: "EtnoJourney",
      type: "website",
      locale: locale === "en" ? "en_US" : "id_ID",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { themeColor: "#fbf8f3" };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("common.nav"), getTranslations("common")]);
  const base = siteUrl();
  const contact = siteContact();
  const organization = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${base}/#organization`,
    name: "EtnoJourney",
    url: localizedUrl("/", locale),
    logo: `${base}/icon.svg`,
    description: tc("footer.about"),
    // Only real, configured contact details (see src/config/site.ts).
    ...(contact.email && { email: contact.email }),
    ...(contact.phone && { telephone: contact.phone }),
    ...(contact.address && {
      address: { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "ID" },
    }),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: "EtnoJourney",
    url: localizedUrl("/", locale),
    inLanguage: locale,
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${localizedUrl("/tours", locale)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable}`}
      // Next 16 keeps CSS smooth scrolling during route changes unless asked
      // not to; without this, navigations and Back animate from the old offset.
      data-scroll-behavior="smooth"
    >
      <body className="min-h-dvh">
        <ImageFadeIn />
        <a
          href="#main"
          className="bg-ink text-sand-50 sr-only z-[100] rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          {t("skipToContent")}
        </a>
        <JsonLd data={[organization, website]} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
