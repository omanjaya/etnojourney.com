import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fitWithin, pairRows, renderTicketPdf, type TicketData } from "./ticket-pdf";

const data: TicketData = {
  heading: "E-tiket",
  documentTitle: "E-tiket EtnoJourney EJ-ABC234",
  language: "id-ID",
  codeLabel: "Kode booking",
  code: "EJ-ABC234",
  tourTitle: "Fajar di P\u016Bra Ulun Danu \u2192 Bratan \u{1F305}",
  destination: "Bedugul, Bali",
  statusLabel: "Status",
  status: "Terkonfirmasi",
  details: [
    { label: "Tanggal perjalanan", value: "Minggu, 15 November 2026" },
    { label: "Peserta", value: "3 orang" },
    { label: "Titik kumpul", value: "Parkiran utama Pura Ulun Danu Beratan" },
    { label: "Nama kontak", value: "Nadia Putri" },
    { label: "Telepon kontak", value: "081234567890" },
  ],
  sections: [
    { title: "Yang perlu dibawa", items: Array.from({ length: 40 }, (_, i) => `Barang ${i + 1}`) },
    { title: "Etika dan adat", items: ["Kenakan kain dan selendang saat masuk pura"] },
  ],
  links: [{ label: "Cek keaslian", url: "https://etnojourney.id/account/bookings/EJ-ABC234" }],
  footer: "Tunjukkan e-tiket ini kepada tuan rumah.",
};

describe("layout helpers", () => {
  it("fitWithin keeps the aspect ratio and never upscales", () => {
    expect(fitWithin(1000, 500, 200, 50)).toEqual({ width: 100, height: 50 });
    expect(fitWithin(100, 50, 400, 400)).toEqual({ width: 100, height: 50 });
    expect(fitWithin(0, 50, 100, 100)).toEqual({ width: 0, height: 0 });
  });

  it("pairRows groups items into rows of two", () => {
    expect(pairRows([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
    expect(pairRows([])).toEqual([]);
  });
});

describe("renderTicketPdf", () => {
  it("renders text outside WinAnsi and breaks long content onto more pages", async () => {
    const bytes = await renderTicketPdf(data);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe("E-tiket EtnoJourney EJ-ABC234");
  });

  it("embeds the brand logo", async () => {
    const logo = readFileSync(path.join(process.cwd(), "public/brand/logo-full-ink.png"));
    const bytes = await renderTicketPdf({ ...data, sections: [] }, new Uint8Array(logo));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
