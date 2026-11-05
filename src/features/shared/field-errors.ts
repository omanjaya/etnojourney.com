import type { z } from "zod";

type Issue = z.core.$ZodIssue;

/**
 * Values a field message may interpolate: `{max}` for "too big/long/many"
 * issues and `{min}` for "too small/short/few" ones, taken from the Zod check.
 */
export function issueParams(issue: Issue): Record<string, number> {
  if (issue.code === "too_big") return { max: Number(issue.maximum) };
  if (issue.code === "too_small") return { min: Number(issue.minimum) };
  return {};
}

/**
 * Groups issue messages by field path. Each issue is listed under its
 * top-level key (as `z.flattenError` does) and under every deeper dotted
 * prefix, so `itinerary.0.title.en` also appears under `itinerary.0` and
 * `itinerary.0.title`. Forms can then mark the exact control. Form-level
 * issues (empty path) are left out, and a key never repeats a message.
 */
export function groupFieldErrors(
  issues: readonly Issue[],
  translate: (issue: Issue) => string,
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const issue of issues) {
    if (issue.path.length === 0) continue;
    const message = translate(issue);
    const segments = issue.path.map(String);
    for (let depth = 1; depth <= segments.length; depth++) {
      const messages = (grouped[segments.slice(0, depth).join(".")] ??= []);
      if (!messages.includes(message)) messages.push(message);
    }
  }
  return grouped;
}
