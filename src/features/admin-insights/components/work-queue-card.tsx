import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Dashboard shortcut to a list that needs attention, with its count. */
export function WorkQueueCard({
  icon: Icon,
  href,
  label,
  count,
  countLabel,
  action,
  urgent,
}: {
  icon: LucideIcon;
  href: string;
  label: string;
  count: number;
  /** Accessible sentence for the count, e.g. "3 waiting". */
  countLabel: string;
  action: string;
  urgent: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group border-line flex items-center gap-4 rounded-(--radius-card) border bg-white p-4 transition-[translate,box-shadow,border-color] duration-300 ease-(--ease-editorial) hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(29_26_22/0.35)]",
        urgent && "border-terracotta/40",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          urgent ? "bg-terracotta-light text-terracotta-dark" : "bg-sand-100 text-ink-soft",
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted block text-xs">{action}</span>
      </span>
      <span className="font-display text-2xl tabular-nums" aria-hidden>
        {count}
      </span>
      <span className="sr-only">{countLabel}</span>
      <ArrowRight
        className="text-muted size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
