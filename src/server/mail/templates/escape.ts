const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for safe interpolation into HTML element content and attribute values. */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Only allows http(s) URLs into href attributes; anything else becomes "#". */
export function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "#";
  } catch {
    return "#";
  }
}
