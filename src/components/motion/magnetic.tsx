"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { canHoverPrecisely } from "./use-reduced-motion";

/**
 * Pulls its child a few pixels toward the pointer (for primary CTAs).
 * Inactive on touch devices and with reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.25,
  className,
}: {
  children: ReactNode;
  /** Fraction of the pointer offset applied, 0..1. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (
      !el ||
      !canHoverPrecisely() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    el.style.setProperty("--mag-x", `${(dx * strength).toFixed(1)}px`);
    el.style.setProperty("--mag-y", `${(dy * strength).toFixed(1)}px`);
  };

  const onLeave = () => {
    ref.current?.style.setProperty("--mag-x", "0px");
    ref.current?.style.setProperty("--mag-y", "0px");
  };

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("magnetic", className)}
    >
      {children}
    </span>
  );
}
