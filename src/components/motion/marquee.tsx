import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite horizontal ticker. The content is rendered twice so the loop is
 * seamless; the copy is hidden from assistive tech. Pauses on hover/focus.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  className,
  label,
}: {
  children: ReactNode;
  /** Seconds per loop. */
  duration?: number;
  reverse?: boolean;
  className?: string;
  /** Accessible name for the region. */
  label?: string;
}) {
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
        className="marquee-track animate-marquee flex w-max"
        style={
          {
            "--marquee-duration": `${duration}s`,
            animationDirection: reverse ? "reverse" : undefined,
          } as CSSProperties
        }
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
