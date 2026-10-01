"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { canHoverPrecisely } from "./use-reduced-motion";

/**
 * Subtle 3D tilt that follows the pointer. Only active for precise hover
 * pointers and when reduced motion is off; otherwise a plain wrapper.
 */
export function Tilt({
  children,
  max = 4,
  className,
}: {
  children: ReactNode;
  /** Maximum rotation in degrees. */
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const enabled = () =>
    canHoverPrecisely() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled()) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.dataset.tilting = "";
    el.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.tilting;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("tilt", className)}
    >
      {children}
    </div>
  );
}
