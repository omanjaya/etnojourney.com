import { escapeHtml, safeUrl } from "./escape";

/** Structured email content; every string is plain text and gets escaped on render. */
export type EmailContent = {
  /** Hidden preview line shown by inbox clients. */
  preheader: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  details?: { label: string; value: string }[];
  button?: { label: string; url: string };
  /** Shown under the button, e.g. the raw link for clients that block buttons. */
  linkFallback?: { label: string; url: string };
  footnotes?: string[];
  footer: string;
};

export type RenderedEmail = { html: string; text: string };

const colors = {
  sand: "#fbf8f3",
  card: "#ffffff",
  ink: "#1d1a16",
  inkSoft: "#4a443c",
  muted: "#7a7166",
  line: "#e4d9c8",
  terracotta: "#b4532a",
};

const fontStack = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const serifStack = "Georgia, 'Times New Roman', serif";

function renderHtml(content: EmailContent): string {
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-family:${fontStack};font-size:15px;line-height:24px;color:${colors.inkSoft};">${escapeHtml(text)}</p>`;

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${colors.line};">
${content.details
  .map(
    (row) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${colors.line};font-family:${fontStack};font-size:13px;color:${colors.muted};">${escapeHtml(row.label)}</td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${colors.line};font-family:${fontStack};font-size:14px;font-weight:bold;color:${colors.ink};">${escapeHtml(row.value)}</td>
</tr>`,
  )
  .join("\n")}
</table>`
    : "";

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td bgcolor="${colors.terracotta}" style="border-radius:999px;">
<a href="${escapeHtml(safeUrl(content.button.url))}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${fontStack};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(content.button.label)}</a>
</td></tr>
</table>`
    : "";

  const fallback = content.linkFallback
    ? `<p style="margin:0 0 16px;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.muted};">${escapeHtml(content.linkFallback.label)}<br><a href="${escapeHtml(safeUrl(content.linkFallback.url))}" style="color:${colors.terracotta};word-break:break-all;">${escapeHtml(content.linkFallback.url)}</a></p>`
    : "";

  const footnotes = (content.footnotes ?? [])
    .map(
      (note) =>
        `<p style="margin:0 0 8px;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.muted};">${escapeHtml(note)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.sand};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.sand}">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:${serifStack};font-size:24px;color:${colors.ink};">Etno<em style="font-weight:normal;">Journey</em></td></tr>
<tr><td bgcolor="${colors.card}" style="padding:40px 32px;border:1px solid ${colors.line};border-radius:20px;">
<h1 style="margin:0 0 20px;font-family:${serifStack};font-size:28px;line-height:34px;font-weight:normal;color:${colors.ink};">${escapeHtml(content.heading)}</h1>
${content.greeting ? paragraph(content.greeting) : ""}
${content.paragraphs.map(paragraph).join("\n")}
${details}
${button}
${fallback}
${footnotes}
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.muted};">${escapeHtml(content.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(content: EmailContent): string {
  const lines: string[] = [content.heading, ""];
  if (content.greeting) lines.push(content.greeting, "");
  for (const p of content.paragraphs) lines.push(p, "");
  if (content.details?.length) {
    for (const row of content.details) lines.push(`${row.label}: ${row.value}`);
    lines.push("");
  }
  if (content.button) lines.push(`${content.button.label}: ${content.button.url}`, "");
  for (const note of content.footnotes ?? []) lines.push(note);
  lines.push("", "--", `EtnoJourney. ${content.footer}`);
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmail(content: EmailContent): RenderedEmail {
  return { html: renderHtml(content), text: renderText(content) };
}
