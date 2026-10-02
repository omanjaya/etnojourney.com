import type { CSSProperties, ReactNode } from "react";
import { SplitWords } from "@/components/motion";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const titleClass = "max-w-4xl text-5xl leading-[1.02] md:text-6xl xl:text-7xl short:text-5xl";
/**
 * List pages (tours, destinations) where results should appear sooner: a
 * smaller title everywhere, especially on phones and short laptop screens.
 */
const compactTitleClass =
  "max-w-4xl text-4xl leading-[1.05] md:text-5xl md:leading-[1.02] xl:text-6xl short:text-4xl";

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
  /** Tighter spacing and a smaller title, for pages whose content is the point. */
  compact?: boolean;
}) {
  const heading = compact ? compactTitleClass : titleClass;
  return (
    <section
      className={cn(
        "grain border-line bg-sand-100 border-b",
        // Clears the fixed header (72px); tighter on short laptop screens.
        compact
          ? "short:pt-24 short:pb-7 pt-24 pb-8 md:pt-32 md:pb-10 xl:pt-36 xl:pb-12"
          : "short:pt-28 short:pb-10 pt-36 pb-14 md:pt-36 md:pb-14 xl:pt-44 xl:pb-20",
        className,
      )}
    >
      <Container>
        {eyebrow && (
          <p
            className={cn("eyebrow animate-fade-up", compact ? "mb-3 md:mb-4" : "short:mb-3 mb-5")}
          >
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
              "text-ink-soft animate-fade-up max-w-2xl leading-relaxed text-balance",
              compact
                ? "short:mt-3 short:text-base mt-3 text-base md:mt-4 md:text-lg"
                : "short:mt-4 short:text-base mt-6 text-lg",
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
