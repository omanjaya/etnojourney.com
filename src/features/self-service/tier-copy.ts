import type { TierRange } from "@/server/services/self-service.rules";

/**
 * Message key and values under `selfService.tier` describing a tier's days,
 * e.g. "14 days or more", "7 to 13 days", "fewer than 7 days".
 */
export function tierRangeMessage(
  range: TierRange,
):
  | { key: "atLeast"; values: { from: number } }
  | { key: "between"; values: { from: number; to: number } }
  | { key: "under"; values: { days: number } } {
  if (range.to === null) return { key: "atLeast", values: { from: range.from } };
  if (range.from <= 0) return { key: "under", values: { days: range.to + 1 } };
  return { key: "between", values: { from: range.from, to: range.to } };
}

/** The tier a cancellation `days` before travel falls in. */
export function rangeFor(ranges: readonly TierRange[], days: number): TierRange | undefined {
  return ranges.find((range) => days >= range.from && (range.to === null || days <= range.to));
}
