/**
 * Builds a `%…%` ILIKE pattern that matches user input literally:
 * `%`, `_` and `\` are escaped (Postgres' default LIKE escape is `\`).
 */
export function likePattern(input: string): string {
  return `%${input.replace(/[%_\\]/g, "\\$&")}%`;
}
