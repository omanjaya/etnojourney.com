import type { CSSProperties, ReactNode } from "react";
import { SplitWords } from "@/components/motion";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const titleClass = "max-w-4xl text-5xl leading-[1.02] md:text-7xl";
/** Smaller title on phones for list pages where content should appear sooner. */
const compactTitleClass = "max-w-4xl text-4xl leading-[1.05] md:text-7xl md:leading-[1.02]";

/** Delay (s) for content that follows a split title, so it lands after the last word. */
function afterTitle(title: ReactNode, extra = 0): CSSProperties {
  const words = typeof title === "string" ? title.trim().split(/\s+/).length : 3;
  return { animationDelay: `${Math.min(0.15 + words * 0.06, 0.7) + extra}s` };
}

/**
 * Standard top-of-page heading for every page except home.
 * Includes the top padding that clears the fixed site header.
 * The title rises word by word on load; eyebrow and description follow.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
  compact = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Tighter spacing and smaller title below `md`; desktop is unchanged. */
  compact?: boolean;
}) {
  const heading = compact ? compactTitleClass : titleClass;
  return (
    <section
      className={cn(
        "grain border-line bg-sand-100 border-b md:pt-44 md:pb-20",
        compact ? "pt-24 pb-8" : "pt-36 pb-14",
        className,
      )}
    >
      <Container>
        {eyebrow && (
          <p className={cn("eyebrow animate-fade-up", compact ? "mb-3 md:mb-5" : "mb-5")}>
            {eyebrow}
          </p>
        )}
        {typeof title === "string" ? (
          <SplitWords as="h1" play="load" text={title} delay={0.08} className={heading} />
        ) : (
          <h1 className={cn(heading, "animate-fade-up")}>{title}</h1>
        )}
        {description && (
          <p
            className={cn(
              "text-ink-soft animate-fade-up max-w-2xl leading-relaxed",
              compact ? "mt-3 text-base md:mt-6 md:text-lg" : "mt-6 text-lg",
            )}
            style={afterTitle(title)}
          >
            {description}
          </p>
        )}
        {children && (
          <div className="animate-fade-up" style={afterTitle(title, 0.1)}>
            {children}
          </div>
        )}
      </Container>
    </section>
  );
}
