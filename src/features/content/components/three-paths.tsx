import type { ReactNode } from "react";
import {
  ArrowUpRight,
  AudioLines,
  Bird,
  BookOpen,
  Compass,
  CookingPot,
  Droplets,
  Flame,
  Flower2,
  Footprints,
  Globe,
  Hammer,
  Info,
  Landmark,
  Leaf,
  MessageCircle,
  MessagesSquare,
  Mountain,
  Music,
  NotebookPen,
  PersonStanding,
  Soup,
  Sprout,
  Sunset,
  TreeDeciduous,
  TreePine,
  Wheat,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { TourCategory } from "@/server/db/schema";
import { Container } from "@/components/layout/container";
import { Reveal, SplitWords } from "@/components/motion";

type PathItem = { key: string; icon: LucideIcon; category?: TourCategory };

/**
 * The three paths from the brand narration. `anchor` is the id on the about
 * page; items only link to a tour category where the catalogue has one.
 */
export const PATHS = [
  {
    key: "traditions",
    anchor: "tradisi",
    icon: Landmark,
    items: [
      { key: "rituals", icon: Flame, category: "ritual" },
      { key: "crafts", icon: Hammer, category: "craft" },
      { key: "storytelling", icon: BookOpen, category: "village" },
      { key: "healing", icon: Leaf },
      { key: "music", icon: Music },
      { key: "culinary", icon: Soup, category: "culinary" },
      { key: "pilgrimage", icon: Mountain, category: "trekking" },
      { key: "custodians", icon: MessagesSquare },
    ],
  },
  {
    key: "inner",
    anchor: "perjalanan-batin",
    icon: Compass,
    items: [
      { key: "meditation", icon: Flower2 },
      { key: "breathwork", icon: Wind },
      { key: "silentWalks", icon: Footprints },
      { key: "journaling", icon: NotebookPen },
      { key: "yoga", icon: PersonStanding },
      { key: "sound", icon: AudioLines },
      { key: "elders", icon: MessageCircle },
      { key: "mindfulCulinary", icon: CookingPot },
    ],
  },
  {
    key: "nature",
    anchor: "alam",
    icon: TreeDeciduous,
    items: [
      { key: "ecoWalks", icon: TreePine, category: "trekking" },
      { key: "water", icon: Droplets },
      { key: "planting", icon: Sprout },
      { key: "wildlife", icon: Bird },
      { key: "farming", icon: Wheat, category: "village" },
      { key: "gatherings", icon: Sunset },
      { key: "sustainability", icon: Globe },
    ],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  anchor: string;
  icon: LucideIcon;
  items: readonly PathItem[];
}>;

/** Keeps "Mamahayu Hayuning Bawana" visually marked as a proper term. */
export const term = (chunks: ReactNode) => <em className="text-terracotta not-italic">{chunks}</em>;

/** About page: the three paths in full, each with its experiences and closing line. */
export async function ThreePaths() {
  const t = await getTranslations("pages.about.paths");

  return (
    <section className="bg-sand-100 grain py-20 md:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-4">{t("eyebrow")}</p>
            <Reveal variant="none">
              <SplitWords
                as="h2"
                text={t("title")}
                className="text-4xl leading-[1.05] md:text-5xl"
              />
            </Reveal>
          </div>
          <Reveal delay={0.15} className="lg:col-span-6 lg:pt-10">
            <p className="text-ink-soft text-lg leading-relaxed">{t("intro")}</p>
            <p className="text-muted mt-4 flex gap-2 text-sm leading-relaxed">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("note")}
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-16 md:mt-20 md:space-y-20">
          {PATHS.map(({ key, anchor, icon: PathIcon, items }, i) => {
            const copy = t.raw(`pillars.${key}.items`) as Array<{ title: string; body: string }>;
            return (
              <article
                key={key}
                id={anchor}
                className="border-line grid scroll-mt-24 gap-8 border-t pt-10 lg:grid-cols-12 lg:gap-12"
              >
                <Reveal className="lg:col-span-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-terracotta text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <PathIcon className="text-terracotta size-6" strokeWidth={1.5} aria-hidden />
                  </div>
                  <h3 className="mt-5 text-2xl leading-tight md:text-3xl">
                    {t(`pillars.${key}.title`)}
                  </h3>
                  <p className="text-ink-soft mt-4 leading-relaxed">
                    {t.rich(`pillars.${key}.intro`, { term })}
                  </p>
                </Reveal>

                <div className="lg:col-span-8">
                  <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {items.map((item: PathItem, j) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.key}>
                          <Reveal
                            variant="fade"
                            delay={Math.min(j * 0.05, 0.3)}
                            className="flex gap-4"
                          >
                            <Icon
                              className="text-terracotta mt-1 size-5 shrink-0"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <div>
                              <h4 className="font-sans font-semibold">{copy[j].title}</h4>
                              <p className="text-ink-soft mt-1 text-sm leading-relaxed">
                                {copy[j].body}
                              </p>
                              {item.category && (
                                <Link
                                  href={{ pathname: "/tours", query: { category: item.category } }}
                                  className="text-terracotta mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                                >
                                  {t("browse")}
                                  <ArrowUpRight className="size-3.5" aria-hidden />
                                </Link>
                              )}
                            </div>
                          </Reveal>
                        </li>
                      );
                    })}
                  </ul>
                  <Reveal delay={0.1}>
                    <p className="font-display border-terracotta text-ink mt-10 border-l-2 pl-5 text-xl leading-snug italic md:text-2xl">
                      {t(`pillars.${key}.closing`)}
                    </p>
                  </Reveal>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
