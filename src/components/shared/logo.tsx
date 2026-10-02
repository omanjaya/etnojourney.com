import Image from "next/image";
import { cn } from "@/lib/utils";

/** Intrinsic size of the PNGs in public/brand (all variants share it). */
const WIDTH = 1005;
const HEIGHT = 491;

/**
 * Brand wordmark: "etno journey" with the Balinese mandala.
 *
 * - `inverted` switches to the white artwork for dark or photo backgrounds.
 * - `full` adds the "pathback" tagline; it is only legible at larger sizes,
 *   so the compact artwork is the default (header, nav).
 *
 * The rendered height comes from `className` (default `h-10`); width follows
 * the aspect ratio. Source files: public/brand (see public/brand/README.md).
 */
export function Logo({
  className,
  inverted = false,
  full = false,
  priority = false,
}: {
  className?: string;
  inverted?: boolean;
  full?: boolean;
  priority?: boolean;
}) {
  const src = `/brand/logo${full ? "-full" : ""}-${inverted ? "white" : "ink"}.png`;
  return (
    <Image
      src={src}
      alt="EtnoJourney"
      width={WIDTH}
      height={HEIGHT}
      priority={priority}
      sizes="(min-width: 640px) 240px, 180px"
      className={cn("h-10 w-auto select-none", className)}
      draggable={false}
    />
  );
}
