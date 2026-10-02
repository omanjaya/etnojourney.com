import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { toWinAnsi, wrapText } from "./text";

/**
 * Everything the e-ticket shows, already localized and formatted. The
 * renderer only lays it out, so it stays free of i18n and database code.
 */
export type TicketData = {
  /** Document heading, e.g. "E-ticket". */
  heading: string;
  codeLabel: string;
  code: string;
  tourTitle: string;
  destination: string;
  statusLabel: string;
  status: string;
  /** Label/value pairs in a two-column grid, filled row by row. */
  details: { label: string; value: string }[];
  /** Bulleted lists such as "What to bring"; empty sections are skipped. */
  sections: { title: string; items: string[] }[];
  /** Printed as label + URL (verification page, cancellation policy). */
  links: { label: string; url: string }[];
  footer: string;
  /** PDF metadata. */
  documentTitle: string;
  language: string;
};

export const PAGE = { width: 595.28, height: 841.89, margin: 48 } as const;

const hex = (value: string): RGB => {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const colors = {
  ink: hex("#1d1a16"),
  inkSoft: hex("#4a443c"),
  muted: hex("#7a7166"),
  line: hex("#e4d9c8"),
  sand: hex("#fbf8f3"),
  terracotta: hex("#b4532a"),
};

/** Scales a `width`x`height` image to fit inside `maxWidth`x`maxHeight`, keeping its ratio. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: width * scale, height: height * scale };
}

/** Groups `items` into rows of two, read left to right (the last row may hold one). */
export function pairRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/** Draws top-down with automatic page breaks. */
class Cursor {
  page: PDFPage;
  y: number;

  constructor(private readonly doc: PDFDocument) {
    this.page = doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }

  /** Starts a new page unless `height` more points fit above the bottom margin. */
  ensure(height: number) {
    if (this.y - height < PAGE.margin + 24) {
      this.page = this.doc.addPage([PAGE.width, PAGE.height]);
      this.y = PAGE.height - PAGE.margin;
    }
  }

  /** Wrapped paragraph; returns nothing, advances the cursor. */
  text(
    value: string,
    options: { font: PDFFont; size: number; color?: RGB; x?: number; width?: number; gap?: number },
  ) {
    const x = options.x ?? PAGE.margin;
    const width = options.width ?? PAGE.width - PAGE.margin - x;
    const lineHeight = options.size * 1.3;
    const lines = wrapText(toWinAnsi(value), width, (s) =>
      options.font.widthOfTextAtSize(s, options.size),
    );
    for (const line of lines) {
      this.ensure(lineHeight);
      this.y -= options.size;
      this.page.drawText(line, {
        x,
        y: this.y,
        size: options.size,
        font: options.font,
        color: options.color ?? colors.ink,
      });
      this.y -= lineHeight - options.size;
    }
    this.y -= options.gap ?? 0;
  }

  rule(gap = 14) {
    this.ensure(gap * 2);
    this.y -= gap;
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.75,
      color: colors.line,
    });
    this.y -= gap;
  }
}

/** Renders the e-ticket as a PDF. `logoPng` is optional so a missing asset never blocks it. */
export async function renderTicketPdf(
  data: TicketData,
  logoPng?: Uint8Array | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(data.documentTitle));
  doc.setAuthor("EtnoJourney");
  doc.setCreator("EtnoJourney");
  doc.setProducer("EtnoJourney");
  doc.setLanguage(data.language);
  doc.setCreationDate(new Date());

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const cursor = new Cursor(doc);

  // Header: logo left, document heading right.
  const headerHeight = 44;
  if (logoPng) {
    const image = await doc.embedPng(logoPng);
    const size = fitWithin(image.width, image.height, 180, headerHeight);
    cursor.page.drawImage(image, {
      x: PAGE.margin,
      y: cursor.y - size.height,
      width: size.width,
      height: size.height,
    });
  } else {
    cursor.page.drawText("EtnoJourney", {
      x: PAGE.margin,
      y: cursor.y - 24,
      size: 22,
      font: bold,
      color: colors.ink,
    });
  }
  const heading = toWinAnsi(data.heading).toUpperCase();
  const headingSize = 11;
  cursor.page.drawText(heading, {
    x: PAGE.width - PAGE.margin - bold.widthOfTextAtSize(heading, headingSize),
    y: cursor.y - headerHeight / 2 - headingSize / 2,
    size: headingSize,
    font: bold,
    color: colors.terracotta,
  });
  cursor.y -= headerHeight;
  cursor.rule(16);

  // Booking code box.
  const boxHeight = 74;
  cursor.page.drawRectangle({
    x: PAGE.margin,
    y: cursor.y - boxHeight,
    width: contentWidth,
    height: boxHeight,
    color: colors.sand,
    borderColor: colors.line,
    borderWidth: 1,
  });
  cursor.page.drawText(toWinAnsi(data.codeLabel).toUpperCase(), {
    x: PAGE.margin + 18,
    y: cursor.y - 24,
    size: 9,
    font: bold,
    color: colors.muted,
  });
  cursor.page.drawText(toWinAnsi(data.code), {
    x: PAGE.margin + 18,
    y: cursor.y - 58,
    size: 30,
    font: bold,
    color: colors.ink,
  });
  const statusLabel = toWinAnsi(data.statusLabel).toUpperCase();
  const status = toWinAnsi(data.status);
  const right = PAGE.width - PAGE.margin - 18;
  cursor.page.drawText(statusLabel, {
    x: right - bold.widthOfTextAtSize(statusLabel, 9),
    y: cursor.y - 24,
    size: 9,
    font: bold,
    color: colors.muted,
  });
  cursor.page.drawText(status, {
    x: right - bold.widthOfTextAtSize(status, 14),
    y: cursor.y - 52,
    size: 14,
    font: bold,
    color: colors.terracotta,
  });
  cursor.y -= boxHeight + 22;

  // Tour.
  cursor.text(data.destination.toUpperCase(), { font: bold, size: 9, color: colors.muted, gap: 4 });
  cursor.text(data.tourTitle, { font: bold, size: 20, gap: 6 });
  cursor.rule(12);

  // Details grid: each row of the grid takes the height of its taller cell.
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  for (const cells of pairRows(data.details)) {
    cursor.ensure(40);
    const rowTop = cursor.y;
    let lowest = rowTop;
    cells.forEach((cell, column) => {
      cursor.y = rowTop;
      const x = PAGE.margin + column * (columnWidth + columnGap);
      cursor.text(cell.label.toUpperCase(), {
        font: bold,
        size: 8,
        color: colors.muted,
        x,
        width: columnWidth,
        gap: 3,
      });
      cursor.text(cell.value, { font: regular, size: 11, x, width: columnWidth });
      lowest = Math.min(lowest, cursor.y);
    });
    cursor.y = lowest - 12;
  }

  // Practical lists.
  for (const section of data.sections.filter((s) => s.items.length > 0)) {
    cursor.rule(10);
    cursor.ensure(40);
    cursor.text(section.title.toUpperCase(), {
      font: bold,
      size: 9,
      color: colors.terracotta,
      gap: 6,
    });
    for (const item of section.items) {
      cursor.ensure(16);
      const bulletY = cursor.y - 6.5;
      cursor.page.drawCircle({ x: PAGE.margin + 3, y: bulletY, size: 1.6, color: colors.muted });
      cursor.text(item, {
        font: regular,
        size: 10,
        color: colors.inkSoft,
        x: PAGE.margin + 12,
        gap: 3,
      });
    }
  }

  // Links.
  if (data.links.length) {
    cursor.rule(12);
    for (const link of data.links) {
      cursor.ensure(32);
      cursor.text(link.label, { font: bold, size: 9, color: colors.muted, gap: 2 });
      cursor.text(link.url, { font: regular, size: 10, color: colors.terracotta, gap: 8 });
    }
  }

  // Footer on every page.
  const footer = toWinAnsi(data.footer);
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const lines = wrapText(footer, contentWidth - 60, (s) => regular.widthOfTextAtSize(s, 8));
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: PAGE.margin,
        y: PAGE.margin - 8 - i * 10,
        size: 8,
        font: regular,
        color: colors.muted,
      });
    });
    if (pages.length > 1) {
      const counter = `${index + 1}/${pages.length}`;
      page.drawText(counter, {
        x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(counter, 8),
        y: PAGE.margin - 8,
        size: 8,
        font: regular,
        color: colors.muted,
      });
    }
  });

  return doc.save();
}
