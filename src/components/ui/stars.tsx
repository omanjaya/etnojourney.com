import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five-star row for an integer rating (1-5). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("size-3.5", i < value ? "fill-gold text-gold" : "text-sand-300")}
        />
      ))}
    </span>
  );
}
