import type { CSSProperties, ElementType } from "react";
import { cn } from "@/lib/utils";

/**
 * Splits text into words that rise in sequence.
 *
 * - `play="load"`: animates on first paint (hero headings).
 * - `play="inView"` (default): animates when an ancestor <Reveal> (any
 *   variant, typically "none") marks itself `data-reveal="done"`.
 *
 * Screen readers get the whole text once from a visually hidden copy; the
 * animated word spans are hidden from them. (`aria-label` is not reliably
 * announced on generic elements, so it is not used.) Works as a Server
 * Component (no JS of its own).
 */
export function SplitWords({
  text,
  as: Tag = "span",
  play = "inView",
  stagger = 60,
  delay = 0,
  className,
}: {
  text: string;
  as?: ElementType;
  play?: "load" | "inView";
  /** Milliseconds between words. */
  stagger?: number;
  /** Seconds before the first word. */
  delay?: number;
  className?: string;
}) {
  const words = text.split(/(\s+)/).filter(Boolean);
  let index = 0;
  return (
    <Tag
      data-play={play === "load" ? "load" : undefined}
      className={cn("split-words", className)}
      style={{ "--split-stagger": `${stagger}ms`, "--split-delay": `${delay}s` } as CSSProperties}
    >
      <span className="sr-only">{text}</span>
      {words.map((word, i) =>
        /^\s+$/.test(word) ? (
          " "
        ) : (
          <span key={i} data-word aria-hidden style={{ "--i": index++ } as CSSProperties}>
            {word}
          </span>
        ),
      )}
    </Tag>
  );
}
