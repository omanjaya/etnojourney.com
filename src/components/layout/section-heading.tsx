import type { ReactNode } from "react";
import { Reveal, SplitWords } from "@/components/motion";
import { cn } from "@/lib/utils";

const titleClass = "text-4xl leading-[1.05] md:text-5xl";

/** Section title that rises word by word when scrolled into view. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <Reveal variant="fade">
            <p className="eyebrow mb-4">{eyebrow}</p>
          </Reveal>
        )}
        {typeof title === "string" ? (
          <Reveal variant="none">
            <SplitWords as="h2" text={title} className={titleClass} />
          </Reveal>
        ) : (
          <Reveal>
            <h2 className={titleClass}>{title}</h2>
          </Reveal>
        )}
        {description && (
          <Reveal delay={0.25}>
            <p className="text-ink-soft mt-5 text-lg leading-relaxed text-balance">{description}</p>
          </Reveal>
        )}
      </div>
      {action && (
        <Reveal variant="fade" delay={0.3} className="shrink-0">
          {action}
        </Reveal>
      )}
    </div>
  );
}
