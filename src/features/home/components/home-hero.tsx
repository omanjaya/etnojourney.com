"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Container } from "@/components/layout/container";
import { CountUp, Magnetic, SplitWords } from "@/components/motion";
import { Button } from "@/components/ui/button";

const HERO_IMAGE = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=2400&q=80";

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
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? { pathname: "/tours", query: { q } } : "/tours");
  };

  return (
    <section
      ref={ref}
      className="bg-indigo relative flex min-h-[100svh] flex-col overflow-hidden text-white"
    >
      {/* Parallax (motion) on the outer layer, Ken Burns (CSS) on the inner one. */}
      <motion.div className="absolute inset-0 scale-110" style={{ y: imageY }}>
        <div className="animate-ken-burns absolute inset-0">
          <Image src={HERO_IMAGE} alt="" fill preload sizes="100vw" className="object-cover" />
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      <motion.div style={{ opacity: contentOpacity }} className="relative flex flex-1 flex-col">
        <Container className="flex flex-1 flex-col justify-center pt-32 pb-12">
          <p
            style={delay(0)}
            className="animate-fade-up text-xs font-semibold tracking-[0.3em] text-white/80 uppercase"
          >
            {t("eyebrow")}
          </p>
          <h1 className="mt-6 max-w-5xl text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] font-medium">
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
            className="animate-fade-up mt-8 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl"
          >
            {t("description")}
          </p>

          <form
            style={delay(580)}
            onSubmit={onSubmit}
            role="search"
            className="animate-fade-up mt-10 flex w-full max-w-xl items-center gap-2 rounded-full border border-white/25 bg-white/10 p-2 backdrop-blur-xl transition-shadow focus-within:border-white/60 focus-within:ring-4 focus-within:ring-white/25"
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

          <div style={delay(680)} className="animate-fade-up mt-6">
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
          <Container className="flex items-center justify-between gap-6 py-6">
            <dl className="grid flex-1 grid-cols-2 gap-6 md:grid-cols-4">
              {stats.map((stat, i) => (
                <div key={stat.label} style={delay(780 + i * 80)} className="animate-fade-up">
                  <dt className="text-xs tracking-wide text-white/60 uppercase">{stat.label}</dt>
                  <dd className="font-display mt-1 text-3xl">
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
      </motion.div>

      <p className="absolute right-4 bottom-40 hidden max-w-[45vh] origin-bottom-right -rotate-90 truncate text-[10px] tracking-[0.25em] text-white/50 uppercase md:block">
        {t("photoCredit")}
      </p>
    </section>
  );
}
