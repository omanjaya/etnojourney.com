import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-sand-100 text-ink-soft",
        terracotta: "bg-terracotta-light text-terracotta-dark",
        leaf: "bg-leaf-light text-leaf",
        gold: "bg-gold-light text-[#8a6420]",
        indigo: "bg-indigo text-sand-50",
        danger: "bg-danger-light text-danger",
        glass: "bg-black/30 text-white backdrop-blur-md",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
