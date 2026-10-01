import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "sand",
  className,
}: {
  icon: LucideIcon;
  label: string;
  /** A string or an animated node such as <CountUp>. */
  value: ReactNode;
  hint?: string;
  accent?: "sand" | "terracotta" | "leaf" | "gold" | "danger" | "indigo";
  className?: string;
}) {
  const accents = {
    sand: "bg-sand-100 text-ink-soft",
    terracotta: "bg-terracotta-light text-terracotta-dark",
    leaf: "bg-leaf-light text-leaf",
    gold: "bg-gold-light text-[#8a6420]",
    danger: "bg-danger-light text-danger",
    indigo: "bg-indigo text-sand-50",
  } as const;

  return (
    <div
      className={cn(
        "group border-line flex flex-col gap-4 rounded-(--radius-card) border bg-white p-4 transition-[translate,box-shadow] duration-300 ease-(--ease-editorial) hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(29_26_22/0.35)] sm:gap-6 sm:p-6",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full transition-transform duration-500 ease-(--ease-editorial) group-hover:scale-110",
          accents[accent],
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <p className="font-display text-2xl tracking-tight break-words tabular-nums sm:text-3xl">
          {value}
        </p>
        <p className="text-ink-soft mt-1 text-sm">{label}</p>
        {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
      </div>
    </div>
  );
}
