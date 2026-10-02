import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine } from "./ics";

const event = {
  uid: "EJ-ABC123@etnojourney.id",
  stamp: new Date("2026-10-02T03:04:05.678Z"),
  startDate: "2026-12-30",
  days: 3,
  summary: "Tongkonan, Sawah, dan Kopi Toraja",
  location: "Bandara Toraja (Buntu Kunik)",
  description: "Kode: EJ-ABC123\nBawa: sepatu, jas hujan; topi",
  url: "https://etnojourney.id/account/bookings/EJ-ABC123",
};

describe("buildIcs", () => {
  const ics = buildIcs(event);

  it("uses CRLF line endings and wraps a single VEVENT", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("writes an all-day range with an exclusive end, across a year boundary", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261230");
    expect(ics).toContain("DTEND;VALUE=DATE:20270102");
    expect(ics).toContain("DTSTAMP:20261002T030405Z");
    expect(ics).toContain("UID:EJ-ABC123@etnojourney.id");
  });

  it("escapes text values", () => {
    expect(ics.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:Kode: EJ-ABC123\\nBawa: sepatu\\, jas hujan\\; topi",
    );
  });

  it("keeps every physical line within 75 octets", () => {
    const long = buildIcs({
      ...event,
      description: "Ulasan panjang tentang perjalanan ".repeat(12),
    });
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("helpers", () => {
  it("escapes backslashes before other characters", () => {
    expect(escapeIcsText("a\\b,c;d\ne")).toBe("a\\\\b\\,c\\;d\\ne");
  });

  it("never splits a multi-byte character when folding", () => {
    const folded = foldIcsLine(`SUMMARY:${"é".repeat(60)}`);
    const parts = folded.split("\r\n ");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join("")).toBe(`SUMMARY:${"é".repeat(60)}`);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
  });

  it("escapes semicolons with a real backslash (RFC 5545)", () => {
    // Regression: "\;" in a JS string literal is just ";".
    expect(escapeIcsText("a;b")).toBe("a\\;b");
    expect(escapeIcsText("a;b")).toHaveLength(4);
  });
});
