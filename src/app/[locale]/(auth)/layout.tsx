import Image from "next/image";
import { Quote } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { CountUp, SplitWords } from "@/components/motion";
import { Logo } from "@/components/shared/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { getCurrentUser } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { reviewService } from "@/server/services/review.service";
import "@/components/layout/layout-motion.css";
import { RouteTransition } from "@/components/layout/route-transition";

const ASIDE_IMAGE =
  "/images/content/site/tegallalang-terraces.webp";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) {
    redirect({ href: "/account", locale: await getLocale() });
  }
  const [t, locale, destinations, summary] = await Promise.all([
    getTranslations("auth.aside"),
    getLocale(),
    destinationService.list(),
    reviewService.summary(),
  ]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-indigo relative hidden overflow-hidden lg:block">
        <div className="animate-fade-in absolute inset-0">
          <Image
            src={ASIDE_IMAGE}
            alt=""
            fill
            preload
            sizes="50vw"
            className="animate-ken-burns object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" aria-label="EtnoJourney" className="logo-link self-start">
            <Logo inverted />
          </Link>
          <figure className="max-w-lg">
            <Quote className="text-gold animate-fade-up size-8" strokeWidth={1.5} aria-hidden />
            <SplitWords
              as="blockquote"
              play="load"
              text={t("quote")}
              stagger={40}
              delay={0.35}
              className="font-display mt-6 text-3xl leading-snug xl:text-4xl"
            />
            <figcaption
              className="animate-fade-up mt-6 text-sm text-white/70"
              style={{ animationDelay: "1.1s" }}
            >
              {t("attribution")}
            </figcaption>
            <dl
              className="animate-fade-up mt-10 flex gap-10 border-t border-white/20 pt-6"
              style={{ animationDelay: "1.25s" }}
            >
              <div>
                <dt className="text-xs tracking-widest text-white/60 uppercase">{t("stat1")}</dt>
                <dd className="font-display mt-1 text-3xl">
                  <CountUp value={destinations.length} locale={locale} duration={1200} />
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-widest text-white/60 uppercase">{t("stat2")}</dt>
                <dd className="font-display mt-1 text-3xl">
                  <CountUp value={summary.tours} locale={locale} duration={1200} />
                </dd>
              </div>
            </dl>
          </figure>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="grain bg-sand-50 flex flex-col outline-none">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" aria-label="EtnoJourney" className="logo-link lg:invisible">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <RouteTransition>
            <div className="auth-stagger w-full max-w-md">{children}</div>
          </RouteTransition>
        </div>
      </main>
    </div>
  );
}
