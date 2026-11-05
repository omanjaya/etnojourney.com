import { describe, expect, it } from "vitest";
import {
  createCreditSchema,
  isHttpsUrl,
  parseReportQuery,
  reportQueryOf,
  updateCreditSchema,
} from "./schemas";

const base = {
  title: "Pura Ulun Danu",
  author: "Jane Doe",
  license: "CC BY-SA 4.0",
  licenseUrl: "",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  source: "Wikimedia Commons",
};

describe("isHttpsUrl", () => {
  it("accepts only absolute https links", () => {
    expect(isHttpsUrl("https://example.com/a")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("/relative")).toBe(false);
    expect(isHttpsUrl("")).toBe(false);
  });
});

describe("credit schemas", () => {
  it("normalizes an empty license link to null", () => {
    const parsed = updateCreditSchema.parse({ ...base, path: "/images/content/bali/pura.webp" });
    expect(parsed.licenseUrl).toBeNull();
  });

  it("rejects non-https links with the httpsUrl key", () => {
    const result = updateCreditSchema.safeParse({
      ...base,
      path: "/images/content/bali/pura.webp",
      sourceUrl: "http://example.com",
      licenseUrl: "ftp://x",
    });
    expect(result.success).toBe(false);
    const issues = result.error!.issues.map((i) => [i.path[0], i.message]);
    expect(issues).toContainEqual(["sourceUrl", "httpsUrl"]);
    expect(issues).toContainEqual(["licenseUrl", "httpsUrl"]);
  });

  it("only creates credits for uploaded images", () => {
    const upload = "/media/tours/2026/05/0f8fad5b-d9cb-469f-a165-70867728950e.webp";
    expect(createCreditSchema.safeParse({ ...base, path: upload }).success).toBe(true);
    expect(
      createCreditSchema.safeParse({ ...base, path: "/images/content/bali/pura.webp" }).success,
    ).toBe(false);
    expect(createCreditSchema.safeParse({ ...base, path: "/etc/passwd" }).success).toBe(false);
  });
});

describe("report query", () => {
  it("round-trips presets and custom ranges through the URL", () => {
    const custom = parseReportQuery({ period: "custom", from: "2026-01-01", to: "2026-01-31" });
    expect(reportQueryOf(custom)).toEqual({
      period: "custom",
      from: "2026-01-01",
      to: "2026-01-31",
    });
    const preset = parseReportQuery({ period: ["last-90", "x"] }, "2026-03-15");
    expect(reportQueryOf(preset)).toEqual({ period: "last-90" });
  });
});
