"use client";

import Image from "next/image";
import { ArrowDown, ArrowRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Container } from "@/components/layout/container";
import { CountUp, Magnetic, SplitWords } from "@/components/motion";
import { Button } from "@/components/ui/button";
import "./home-hero.css";

const HERO_IMAGE = "/images/content/site/hero-ulun-danu.webp";

/** Staggered CSS entrance: content is visible in server HTML, so text paints before hydration. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Headline word timing: first word at HEADLINE_START, then WORD_STAGGER between words. */
const HEADLINE_START = 0.12;
const WORD_STAGGER = 45;
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export type HeroStat = { value: number; decimals?: number; label: string };

export function HomeHero({ stats }: { stats: HeroStat[] }) {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? { pathname: "/tours", query: { q } } : "/tours");
  };

  return (
    <section
      className="hero bg-indigo relative flex min-h-[100svh] flex-col overflow-hidden text-white"
    >
      {/* Scroll-driven parallax (CSS) on the outer layer, Ken Burns on the inner one. */}
      <div className="hero-drift absolute inset-0 scale-110">
        <div className="animate-ken-burns absolute inset-0">
          <Image src={HERO_IMAGE} alt="" fill preload sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      <div className="hero-fade relative flex flex-1 flex-col">
        {/* Sizes and gaps scale with viewport height (svh) too, so the whole hero,
            stats bar included, fits one screen on short laptop/desktop windows. */}
        <Container className="flex flex-1 flex-col justify-center pt-[clamp(5.5rem,15svh,8rem)] pb-[clamp(1.25rem,4svh,3rem)]">
          <p
            style={delay(0)}
            className="animate-fade-up text-xs font-semibold tracking-[0.3em] text-white/80 uppercase"
          >
            {t("eyebrow")}
          </p>
          <h1 className="mt-[clamp(0.75rem,2.5svh,1.5rem)] max-w-5xl text-[clamp(2.75rem,min(8vw,11.5svh),7.5rem)] leading-[0.95] font-medium">
            <span className="sr-only">
              {t("titleStart")} {t("titleAccent")} {t("titleEnd")}
            </span>
            {/* Words rise in sequence on first paint (pure CSS, no JS needed). */}
            <span aria-hidden>
              <SplitWords
                text={t("titleStart")}
                play="load"
                stagger={WORD_STAGGER}
                delay={HEADLINE_START}
              />{" "}
              <SplitWords
                text={t("titleAccent")}
                as="em"
                play="load"
                stagger={WORD_STAGGER}
                delay={HEADLINE_START + (wordCount(t("titleStart")) * WORD_STAGGER) / 1000}
                className="text-sand-200 font-normal italic"
              />
              <br className="hidden md:block" />{" "}
              <SplitWords
                text={t("titleEnd")}
                play="load"
                stagger={WORD_STAGGER}
                delay={
                  HEADLINE_START +
                  ((wordCount(t("titleStart")) + wordCount(t("titleAccent"))) * WORD_STAGGER) / 1000
                }
              />
            </span>
          </h1>
          <p
            style={delay(480)}
            className="animate-fade-up short:md:text-lg mt-[clamp(1rem,3.5svh,2rem)] max-w-xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl"
          >
            {t("description")}
          </p>

          <form
            style={delay(580)}
            onSubmit={onSubmit}
            role="search"
            className="animate-fade-up mt-[clamp(1.25rem,4.5svh,2.5rem)] flex w-full max-w-xl items-center gap-2 rounded-full border border-white/25 bg-white/10 p-2 backdrop-blur-xl transition-shadow focus-within:border-white/60 focus-within:ring-4 focus-within:ring-white/25"
          >
            <label htmlFor="hero-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <Search className="ml-4 size-5 shrink-0 text-white/70" aria-hidden />
            <input
              id="hero-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              maxLength={80}
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/60 focus:outline-none"
            />
            <Button type="submit" variant="light" size="md">
              {t("searchCta")}
            </Button>
          </form>

          <div style={delay(680)} className="animate-fade-up mt-[clamp(0.75rem,2.5svh,1.5rem)]">
            <Magnetic strength={0.3}>
              <Link
                href="/tours"
                className="group inline-flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"
              >
                {t("explore")}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </Magnetic>
          </div>
        </Container>

        <div className="relative border-t border-white/15 bg-black/20 backdrop-blur-md">
          <Container className="flex items-center justify-between gap-6 py-[clamp(0.875rem,2.5svh,1.5rem)]">
            <dl className="grid flex-1 grid-cols-4 gap-3 sm:gap-6">
              {stats.map((stat, i) => (
                <div key={stat.label} style={delay(780 + i * 80)} className="animate-fade-up">
                  <dt className="text-[10px] leading-tight tracking-wide text-white/60 uppercase sm:text-xs">{stat.label}</dt>
                  <dd className="font-display short:text-2xl mt-1 text-xl sm:text-3xl">
                    <CountUp value={stat.value} decimals={stat.decimals} locale={locale} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="hidden flex-col items-center gap-2 text-[10px] tracking-[0.3em] text-white/60 uppercase lg:flex">
              <ArrowDown className="size-4 animate-bounce" aria-hidden />
              {t("scroll")}
            </div>
          </Container>
        </div>
      </div>

      <p className="absolute right-4 bottom-40 hidden max-w-[45vh] origin-bottom-right -rotate-90 truncate text-[10px] tracking-[0.25em] text-white/50 uppercase md:block">
        {t("photoCredit")}
      </p>
    </section>
  );
}
