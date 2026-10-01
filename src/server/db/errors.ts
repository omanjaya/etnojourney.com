/**
 * Postgres error helpers. Drizzle wraps driver errors (`DrizzleQueryError`)
 * and keeps the original postgres-js error on `cause`, so both are checked.
 */
type PgError = { code?: string; constraint_name?: string; constraint?: string };

function pgError(error: unknown): PgError | null {
  for (let current = error, depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && typeof current.code === "string") {
      return current as PgError;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

/** True for a unique-constraint violation (SQLSTATE 23505), optionally on a specific constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pg = pgError(error);
  if (pg?.code !== "23505") return false;
  if (!constraint) return true;
  return (pg.constraint_name ?? pg.constraint) === constraint;
}
