"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `value` when scrolled into view.
 * The server renders the final value, so no-JS and crawlers see real numbers.
 */
export function CountUp({
  value,
  locale,
  decimals = 0,
  duration = 1600,
  className,
}: {
  value: number;
  locale: string;
  decimals?: number;
  /** Milliseconds. */
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<number | null>(null);
  const format = (n: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(value * eased);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {/* The final value for assistive tech; the animated digits are hidden from it. */}
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="tabular-nums">
        {format(display ?? value)}
      </span>
    </span>
  );
}
