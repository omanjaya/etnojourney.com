import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-300 ease-(--ease-editorial) disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    // Refined feedback: a 1px lift on hover, a soft press, and a trailing icon
    // (e.g. an arrow after the label) nudges forward.
    "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
    "[&_svg:last-child:not(:first-child)]:transition-transform [&_svg:last-child:not(:first-child)]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-terracotta text-sand-50 shadow-[0_8px_24px_-12px_rgb(180_83_42/0.8)] hover:bg-terracotta-dark hover:shadow-[0_12px_28px_-12px_rgb(180_83_42/0.9)]",
        dark: "bg-ink text-sand-50 hover:bg-indigo",
        outline: "border border-ink/15 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/5",
        ghost: "text-ink hover:bg-ink/5",
        light: "bg-sand-50 text-ink hover:bg-white",
        glass: "border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
