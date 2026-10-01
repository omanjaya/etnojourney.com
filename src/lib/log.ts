/**
 * Makes an untrusted value safe to put in a log line: JSON-quoted (so CR/LF and
 * control characters are escaped and can't forge extra log entries) and
 * truncated so a large payload can't flood the logs.
 */
export function logValue(value: unknown, maxLength = 120): string {
  const text = typeof value === "string" ? value : String(value);
  const clipped = text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  return JSON.stringify(clipped);
}
