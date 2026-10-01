"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant = "fade-up" | "fade" | "scale" | "mask-left" | "mask-up" | "none";

/**
 * Animates its children once when they scroll into view.
 *
 * Server HTML is always visible (no JS, slow hydration and crawlers see the
 * content). After mount, only elements still below the viewport are hidden
 * (`data-reveal="pending"`) and then revealed by an IntersectionObserver.
 * Reduced motion skips it entirely. Styles live in globals.css.
 *
 * `variant="none"` changes nothing itself; use it to trigger nested
 * <SplitWords> or other `[data-reveal="done"]` descendants.
 */
export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  /** Seconds. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "done";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-variant={variant}
      style={
        {
          ...style,
          ...(delay ? { transitionDelay: `${delay}s`, "--split-delay": `${delay}s` } : {}),
        } as CSSProperties
      }
      className={cn(className)}
    >
      {children}
    </div>
  );
}
