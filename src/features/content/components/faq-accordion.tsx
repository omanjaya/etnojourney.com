import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion";
import type { FaqGroup } from "../legal";
import "../content.css";

/**
 * Grouped FAQ built on native <details>/<summary>: keyboard and screen-reader
 * accessible without JavaScript; height animates via CSS where supported.
 */
export function FaqAccordion({ groups }: { groups: { id: string; group: FaqGroup }[] }) {
  return (
    <div className="space-y-16">
      {groups.map(({ id, group }, gi) => (
        <Reveal key={id} delay={Math.min(gi * 0.05, 0.2)}>
          <section id={id} aria-labelledby={`faq-${id}`} className="scroll-mt-28">
            <h2 id={`faq-${id}`} className="text-3xl md:text-4xl">
              {group.title}
            </h2>
            <div className="border-line mt-6 divide-y divide-[var(--color-line)] border-y">
              {group.items.map((item) => (
                <details key={item.q} name={`faq-${id}`} className="faq-item group">
                  <summary className="hover:text-terracotta flex cursor-pointer items-start justify-between gap-6 py-5 text-lg font-medium transition-colors">
                    <span>{item.q}</span>
                    <span className="border-line group-open:border-terracotta group-open:text-terracotta grid size-8 shrink-0 place-items-center rounded-full border">
                      <Plus className="faq-chevron size-4" aria-hidden />
                    </span>
                  </summary>
                  <p className="text-ink-soft max-w-3xl pb-6 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </Reveal>
      ))}
    </div>
  );
}
