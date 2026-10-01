import type { CSSProperties, ReactNode } from "react";
import { SplitWords } from "@/components/motion";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const titleClass = "max-w-4xl text-5xl leading-[1.02] md:text-7xl";

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
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grain border-line bg-sand-100 border-b pt-36 pb-14 md:pt-44 md:pb-20",
        className,
      )}
    >
      <Container>
        {eyebrow && <p className="eyebrow animate-fade-up mb-5">{eyebrow}</p>}
        {typeof title === "string" ? (
          <SplitWords as="h1" play="load" text={title} delay={0.08} className={titleClass} />
        ) : (
          <h1 className={cn(titleClass, "animate-fade-up")}>{title}</h1>
        )}
        {description && (
          <p
            className="text-ink-soft animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed"
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
