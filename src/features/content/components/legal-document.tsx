import { FileWarning } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion";
import { LEGAL_UPDATED, type LegalSection } from "../legal";

type LegalNamespace = "cancellation" | "privacy" | "terms";

/**
 * Shared layout for the policy pages: template notice, contents and numbered
 * sections. `extras` adds content after a section's text, keyed by section id
 * (e.g. tables generated from config).
 */
export async function LegalDocument({
  document,
  extras = {},
}: {
  document: LegalNamespace;
  extras?: Partial<Record<string, ReactNode>>;
}) {
  const [locale, t, tl] = await Promise.all([
    getLocale(),
    getTranslations(`pages.${document}`),
    getTranslations("pages.legal"),
  ]);
  const sections = t.raw("sections") as LegalSection[];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
        <p className="text-muted mt-6 text-sm">
          {tl("updated", { date: formatDate(LEGAL_UPDATED[document], locale) })}
        </p>
      </PageHeader>

      <Container className="grid gap-12 py-16 md:py-24 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-labelledby="legal-toc">
            <h2 id="legal-toc" className="eyebrow mb-4">
              {tl("toc")}
            </h2>
            <ol className="border-line space-y-1 border-l text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-ink-soft hover:border-terracotta hover:text-ink -ml-px inline-block border-l border-transparent py-1.5 pl-4 transition-colors"
                  >
                    {i + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="max-w-3xl">
          <div
            role="note"
            className="border-gold/40 bg-gold-light mb-12 flex gap-3 rounded-xl border px-5 py-4 text-sm leading-relaxed text-[#6f5119]"
          >
            <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{tl("templateNotice")}</p>
          </div>

          {sections.map((section, i) => (
            <Reveal key={section.id}>
              <section
                id={section.id}
                className="border-line scroll-mt-28 border-b py-10 first:pt-0"
              >
                <h2 className="text-3xl">
                  <span className="text-terracotta mr-3 font-sans text-base font-semibold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className="text-ink-soft mt-5 space-y-4 text-lg leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul className="marker:text-terracotta list-disc space-y-2 pl-6">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {extras[section.id]}
                </div>
              </section>
            </Reveal>
          ))}

          <section className="pt-10">
            <h2 className="text-2xl">{tl("contactTitle")}</h2>
            <p className="text-ink-soft mt-3 leading-relaxed">{tl("contactBody")}</p>
          </section>
        </article>
      </Container>
    </>
  );
}
