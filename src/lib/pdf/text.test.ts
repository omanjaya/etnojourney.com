import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { safeFilename, toWinAnsi, wrapText } from "./text";

describe("toWinAnsi", () => {
  it("keeps ASCII and Latin-1 text as is", () => {
    expect(toWinAnsi("Desa Penglipuran, Bangli")).toBe("Desa Penglipuran, Bangli");
    expect(toWinAnsi("Café crème, Ålesund, naïve")).toBe("Café crème, Ålesund, naïve");
  });

  it("keeps the Windows-1252 typographic characters", () => {
    expect(toWinAnsi("“Sawah” – ‘subak’ — 5€ …")).toBe("“Sawah” – ‘subak’ — 5€ …");
  });

  it("replaces look-alikes and strips accents outside Latin-1", () => {
    expect(toWinAnsi("08.00\u201110.00 \u2192 Ubud")).toBe("08.00-10.00 -> Ubud");
    expect(toWinAnsi("Pūra Ulun Dānu Bratan")).toBe("Pura Ulun Danu Bratan");
    expect(toWinAnsi("\u22125 °C \u2264 x")).toBe("-5 °C <= x");
  });

  it("drops emoji, CJK and control characters and flattens whitespace", () => {
    expect(toWinAnsi("Bawa topi \u{1F9E2} dan air\n\tminum \u6C34")).toBe(
      "Bawa topi dan air minum",
    );
    expect(toWinAnsi("a\u00a0\u202fb\u200bc")).toBe("a bc");
    expect(toWinAnsi("\u0000x\u0007")).toBe("x");
  });

  it("never yields a character Helvetica cannot encode", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const supported = new Set(font.getCharacterSet());
    let sample = "";
    // Latin, symbols and CJK punctuation (below the surrogate range), then
    // astral characters: an emoji, a skin-tone modifier and a flag sequence.
    for (let code = 0; code < 0x3100; code++) sample += String.fromCodePoint(code);
    sample += "\u{1F600}\u{1F44D}\u{1F3FD}\u{1F1EE}\u{1F1E9}";
    const out = toWinAnsi(sample);
    const bad = Array.from(out).filter((c) => !supported.has(c.codePointAt(0)!));
    expect(bad).toEqual([]);
    expect(() => font.encodeText(out)).not.toThrow();
  });
});

describe("wrapText", () => {
  const measure = (s: string) => s.length; // one unit per character

  it("wraps on word boundaries", () => {
    expect(wrapText("satu dua tiga empat", 9, measure)).toEqual(["satu dua", "tiga", "empat"]);
  });

  it("splits words longer than the line", () => {
    expect(wrapText("https://etnojourney.id/x", 10, measure)).toEqual([
      "https://et",
      "nojourney.",
      "id/x",
    ]);
  });

  it("returns no lines for empty text", () => {
    expect(wrapText("", 10, measure)).toEqual([]);
    expect(wrapText("   ", 10, measure)).toEqual([]);
  });
});

describe("safeFilename", () => {
  it("keeps only safe characters", () => {
    expect(safeFilename('EJ-AB12"; rm -rf /')).toBe("EJ-AB12-rm-rf");
    expect(safeFilename("Tiket Pūra.pdf")).toBe("Tiket-Pura.pdf");
    expect(safeFilename("../..")).toBe("download");
  });
});
