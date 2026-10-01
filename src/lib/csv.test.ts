import { describe, expect, it } from "vitest";
import { csvRow, escapeCsvCell, neutralizeFormula } from "./csv";

describe("escapeCsvCell", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvCell("EJ-ABC123")).toBe("EJ-ABC123");
    expect(escapeCsvCell(1_400_000)).toBe("1400000");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(escapeCsvCell("Ubud, Bali")).toBe('"Ubud, Bali"');
    expect(escapeCsvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(escapeCsvCell("+62812")).toBe("'+62812");
    expect(escapeCsvCell("-1+1")).toBe("'-1+1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("\tcmd")).toBe("'\tcmd");
  });

  it("keeps real negative numbers numeric", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
  });

  it("does not touch safe leading characters", () => {
    expect(neutralizeFormula("Nadia")).toBe("Nadia");
    expect(neutralizeFormula("08123")).toBe("08123");
  });
});

describe("csvRow", () => {
  it("joins cells and ends with CRLF", () => {
    expect(csvRow(["a", 1, null, "b,c"])).toBe('a,1,,"b,c"\r\n');
  });
});
