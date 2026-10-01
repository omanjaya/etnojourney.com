import { cn } from "@/lib/utils";

/** Wordmark with a stylised kawung (batik) motif. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="15" className={inverted ? "fill-sand-50" : "fill-ink"} />
        <g className="fill-terracotta">
          <ellipse cx="16" cy="9.5" rx="3.2" ry="5" />
          <ellipse cx="16" cy="22.5" rx="3.2" ry="5" />
          <ellipse cx="9.5" cy="16" rx="5" ry="3.2" />
          <ellipse cx="22.5" cy="16" rx="5" ry="3.2" />
        </g>
        <circle cx="16" cy="16" r="1.8" className={inverted ? "fill-ink" : "fill-sand-50"} />
      </svg>
      <span
        className={cn(
          "font-display text-xl font-semibold tracking-tight",
          inverted ? "text-sand-50" : "text-ink",
        )}
      >
        Etno<span className="font-normal italic">Journey</span>
      </span>
    </span>
  );
}
