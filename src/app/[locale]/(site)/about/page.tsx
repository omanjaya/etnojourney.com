import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Footprints,
  HandCoins,
  HeartHandshake,
  Sprout,
  UsersRound,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Magnetic, Reveal, SplitWords } from "@/components/motion";
import { Button } from "@/components/ui/button";

const MISSION_IMAGE =
  "/images/content/site/tegallalang-terraces.webp";
const PARTNERS_IMAGE =
  "/images/content/site/borobudur-walk.webp";

const PRINCIPLES = [
  { key: "fair", icon: HandCoins },
  { key: "small", icon: UsersRound },
  { key: "consent", icon: HeartHandshake },
  { key: "real", icon: Sprout },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages.about.meta" });
  return pageMetadata({
    locale,
    path: "/about",
    title: t("title"),
    description: t("description"),
    image: MISSION_IMAGE,
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("pages.about");
  const missionBody = t.raw("mission.body") as string[];
  const partnersBody = t.raw("partners.body") as string[];
  const responsibleItems = t.raw("responsible.items") as string[];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {/* Mission */}
      <Container className="grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-20">
        <Reveal
          variant="mask-left"
          className="relative aspect-[4/5] overflow-hidden rounded-(--radius-card)"
        >
          <Image
            src={MISSION_IMAGE}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </Reveal>
        <div>
          <p className="eyebrow mb-4">{t("mission.eyebrow")}</p>
          <Reveal variant="none">
            <SplitWords
              as="h2"
              text={t("mission.title")}
              className="text-4xl leading-[1.05] md:text-5xl"
            />
          </Reveal>
          <Reveal delay={0.15} className="text-ink-soft mt-6 space-y-5 text-lg leading-relaxed">
            {missionBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>
        </div>
      </Container>

      {/* Principles */}
      <section className="bg-indigo text-sand-50 py-20 md:py-28">
        <Container>
          <p className="eyebrow text-gold! mb-4">{t("principles.eyebrow")}</p>
          <Reveal variant="none">
            <SplitWords
              as="h2"
              text={t("principles.title")}
              className="max-w-3xl text-4xl leading-[1.05] text-white md:text-5xl"
            />
          </Reveal>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-(--radius-card) bg-white/10 md:grid-cols-2">
            {PRINCIPLES.map(({ key, icon: Icon }, i) => (
              <li key={key} className="bg-indigo">
                <Reveal delay={Math.min(i * 0.08, 0.3)} className="h-full p-8 md:p-10">
                  <div className="flex items-center justify-between">
                    <span className="text-gold font-sans text-sm font-semibold tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="text-gold size-6" strokeWidth={1.5} aria-hidden />
                  </div>
                  <h3 className="mt-6 text-2xl text-white">{t(`principles.items.${key}.title`)}</h3>
                  <p className="text-sand-100/75 mt-3 leading-relaxed">
                    {t(`principles.items.${key}.body`)}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Responsible travel */}
      <Container id="responsible" className="scroll-mt-24 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">{t("responsible.eyebrow")}</p>
            <Reveal variant="none">
              <SplitWords
                as="h2"
                text={t("responsible.title")}
                className="text-4xl leading-[1.05] md:text-5xl"
              />
            </Reveal>
          </div>
          <ul className="space-y-4 lg:col-span-7">
            {responsibleItems.map((item, i) => (
              <li key={item}>
                <Reveal
                  delay={Math.min(i * 0.08, 0.3)}
                  className="border-line flex gap-4 rounded-(--radius-card) border bg-white p-6"
                >
                  <Footprints className="text-terracotta mt-0.5 size-5 shrink-0" aria-hidden />
                  <p className="text-ink-soft leading-relaxed">{item}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* Village partners */}
      <section id="partners" className="bg-sand-100 grain scroll-mt-24 py-20 md:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="lg:order-2">
            <Reveal
              variant="mask-up"
              className="relative aspect-[4/3] overflow-hidden rounded-(--radius-card)"
            >
              <Image
                src={PARTNERS_IMAGE}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </Reveal>
          </div>
          <div>
            <p className="eyebrow mb-4">{t("partners.eyebrow")}</p>
            <Reveal variant="none">
              <SplitWords
                as="h2"
                text={t("partners.title")}
                className="text-4xl leading-[1.05] md:text-5xl"
              />
            </Reveal>
            <Reveal delay={0.15} className="text-ink-soft mt-6 space-y-5 text-lg leading-relaxed">
              {partnersBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Reveal>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <Container className="py-20 text-center md:py-28">
        <Reveal variant="none">
          <SplitWords
            as="h2"
            text={t("cta.title")}
            className="mx-auto max-w-3xl text-4xl md:text-6xl"
          />
        </Reveal>
        <Reveal delay={0.2}>
          <p className="text-ink-soft mx-auto mt-5 max-w-xl text-lg">{t("cta.body")}</p>
          <Magnetic className="mt-8">
            <Button asChild size="lg">
              <Link href="/tours">
                {t("cta.button")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Magnetic>
        </Reveal>
      </Container>
    </>
  );
}
