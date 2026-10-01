import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  className,
  label,
}: {
  value: number;
  count?: number;
  className?: string;
  /** Accessible label, e.g. "Rated 4.8 out of 5". */
  label: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)} aria-label={label}>
      <Star className="fill-gold text-gold size-4" aria-hidden />
      <span className="font-semibold">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-current/75">({count})</span>}
    </span>
  );
}
