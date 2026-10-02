import { cn } from "@/lib/utils";
import type { CapacityLoad } from "@/server/services/departure.rules";

/**
 * Seats on a departure: confirmed (solid) and pending (striped) against the
 * tour's capacity. `label` is the accessible sentence for the whole bar.
 */
export function CapacityBar({
  load,
  label,
  className,
}: {
  load: CapacityLoad;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "bg-sand-100 flex h-2 w-full overflow-hidden rounded-full print:border print:border-black",
        className,
      )}
    >
      <span
        className={cn("h-full", load.overbooked ? "bg-danger" : "bg-leaf")}
        style={{ width: `${load.confirmedPercent}%` }}
      />
      <span
        className="bg-gold h-full bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(255_255_255/0.45)_3px_6px)]"
        style={{ width: `${load.pendingPercent}%` }}
      />
    </div>
  );
}
