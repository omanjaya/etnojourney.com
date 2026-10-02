import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/layout/container";
import { Reveal, SplitWords } from "@/components/motion";
import { PATHS, term } from "@/features/content/components/three-paths";

/** Home: the opening narration and the three paths, each linking to its part of /about. */
export async function Manifesto() {
  const t = await getTranslations("home.manifesto");

  return (
    <section className="short:py-12 py-16 md:py-24">
      <Container>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">{t("eyebrow")}</p>
            <Reveal variant="none">
              <SplitWords
                as="h2"
                text={t("title")}
                className="short:text-4xl text-4xl leading-[1.05] md:text-5xl"
              />
            </Reveal>
          </div>
          <Reveal delay={0.15} className="lg:col-span-7 lg:pt-9">
            <p className="text-ink text-lg leading-relaxed md:text-xl">{t("lead")}</p>
            <p className="text-ink-soft mt-4 leading-relaxed">{t("closing")}</p>
          </Reveal>
        </div>

        <p className="eyebrow short:mt-8 mt-12 mb-5">{t("invite")}</p>
        <ol className="border-line bg-line grid gap-px overflow-hidden rounded-(--radius-card) border md:grid-cols-3">
          {PATHS.map(({ key, anchor, icon: Icon }, i) => (
            <li key={key} className="bg-sand-50 [&>div]:h-full">
              <Reveal variant="fade" delay={Math.min(i * 0.08, 0.3)}>
                <Link
                  href={{ pathname: "/about", hash: anchor }}
                  className="group hover:bg-ink hover:text-sand-50 short:p-6 flex h-full flex-col gap-4 p-6 transition-colors duration-500 md:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-muted group-hover:text-sand-300 text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon
                      className="text-terracotta group-hover:text-gold size-7 transition-transform duration-500 group-hover:-translate-y-1"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                  </div>
                  <h3 className="font-display text-2xl leading-tight">{t(`paths.${key}.title`)}</h3>
                  <p className="text-ink-soft group-hover:text-sand-100/80 leading-relaxed transition-colors duration-500">
                    {t.rich(`paths.${key}.body`, { term })}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium">
                    {t("more")}
                    <ArrowRight
                      className="size-4 transition-transform duration-500 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
