import { barWidth } from "@/server/services/report.rules";
import { cn } from "@/lib/utils";

export type Bar = { key: string; label: string; value: number; display: string };

/**
 * Horizontal bar chart in plain HTML/CSS. Each row is a list item whose text
 * (label and formatted value) is read by screen readers; the bar itself is
 * decorative. Negative values (net after refunds) render as an empty bar.
 */
export function BarChart({
  title,
  bars,
  tone = "terracotta",
  className,
}: {
  title: string;
  bars: Bar[];
  tone?: "terracotta" | "indigo" | "leaf";
  className?: string;
}) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  const fill = { terracotta: "bg-terracotta", indigo: "bg-indigo", leaf: "bg-leaf" }[tone];

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <figcaption className="text-ink-soft text-sm font-medium">{title}</figcaption>
      <ul className="flex flex-col gap-2.5">
        {bars.map((bar) => (
          <li
            key={bar.key}
            className="grid grid-cols-[minmax(5rem,9rem)_1fr] items-center gap-3 text-sm"
          >
            <span className="text-ink-soft truncate" title={bar.label}>
              {bar.label}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="bg-sand-100 relative h-3 flex-1 overflow-hidden rounded-full"
                aria-hidden
              >
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-full", fill)}
                  style={{ width: `${barWidth(bar.value, max)}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-xs tabular-nums">{bar.display}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
