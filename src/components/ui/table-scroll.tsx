import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrolling wrapper for wide tables. It is a labelled, focusable
 * region so keyboard users can scroll it with the arrow keys (WCAG 2.1.1).
 */
export function TableScroll({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "border-line overflow-x-auto rounded-(--radius-card) border bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
