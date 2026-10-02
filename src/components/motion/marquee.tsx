"use client";

import { Children, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Seconds per item before the real width is measured (and without JS). */
const FALLBACK_SECONDS_PER_ITEM = 8;

/**
 * Infinite horizontal ticker. The content is rendered twice so the loop is
 * seamless; the copy is hidden from assistive tech. Pauses on hover/focus.
 *
 * Motion is defined by `speed` (pixels per second), not a fixed duration, so
 * the text stays readable however many items there are and on any screen
 * width: the loop duration is derived from the measured content width.
 */
export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className,
  label,
}: {
  children: ReactNode;
  /** Pixels per second; ~30-50 reads comfortably. */
  speed?: number;
  reverse?: boolean;
  className?: string;
  /** Accessible name for the region. */
  label?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fallbackDuration = Math.max(20, Children.count(children) * FALLBACK_SECONDS_PER_ITEM);

  useEffect(() => {
    const content = contentRef.current;
    const track = trackRef.current;
    if (!content || !track) return;
    const update = () => {
      // One copy's width is the distance travelled per loop (translateX -50%).
      // Set animation-duration directly: a custom property would be ignored,
      // because --animate-marquee is resolved once on :root (40s fallback).
      const seconds = Math.max(20, content.scrollWidth / speed);
      track.style.animationDuration = `${seconds.toFixed(1)}s`;
    };
    update();
    // Re-measure when fonts load or the viewport changes the text size.
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => observer.disconnect();
  }, [speed]);

  return (
    <div
      className={cn(
        "marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      <div
        ref={trackRef}
        className="marquee-track animate-marquee flex w-max"
        style={
          {
            animationDuration: `${fallbackDuration}s`,
            animationDirection: reverse ? "reverse" : undefined,
          } as CSSProperties
        }
      >
        <div ref={contentRef} className="flex shrink-0 items-center">
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
