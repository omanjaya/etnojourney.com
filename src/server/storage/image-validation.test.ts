import { describe, expect, it } from "vitest";
import {
  buildImageKey,
  exceedsPixelLimit,
  MAX_UPLOAD_BYTES,
  sniffImageFormat,
  validateUpload,
} from "./image-validation";
import { contentTypeForKey, normalizeKey } from "./storage";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])),
  );

describe("sniffImageFormat", () => {
  it("detects formats by magic bytes", () => {
    expect(sniffImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffImageFormat(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(sniffImageFormat(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("webp");
    expect(sniffImageFormat(bytes(0, 0, 0, 0x1c, "ftypavif"))).toBe("avif");
  });

  it("rejects text, SVG, GIF and truncated headers", () => {
    expect(sniffImageFormat(bytes("hello world, not an image"))).toBeNull();
    expect(sniffImageFormat(bytes("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImageFormat(bytes("GIF89a"))).toBeNull();
    expect(sniffImageFormat(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffImageFormat(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toBeNull();
  });
});

describe("validateUpload", () => {
  it("rejects empty and oversized files before decoding", () => {
    expect(validateUpload(new Uint8Array())).toBe("empty");
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(validateUpload(big)).toBe("tooLarge");
  });

  it("returns the format for supported files and flags the rest", () => {
    expect(validateUpload(bytes(0xff, 0xd8, 0xff, 0xdb))).toBe("jpeg");
    expect(validateUpload(bytes("plain text renamed to .jpg"))).toBe("unsupported");
  });
});

describe("limits and keys", () => {
  it("enforces the 40 megapixel ceiling", () => {
    expect(exceedsPixelLimit(8000, 5000)).toBe(false);
    expect(exceedsPixelLimit(8000, 5001)).toBe(true);
  });

  it("builds date-partitioned webp keys", () => {
    const key = buildImageKey("tours", "abc-123", new Date(Date.UTC(2026, 0, 5)));
    expect(key).toBe("tours/2026/01/abc-123.webp");
    expect(normalizeKey(key)).toBe(key);
    expect(contentTypeForKey(key)).toBe("image/webp");
  });
});

describe("normalizeKey", () => {
  it("rejects traversal, absolute paths, hidden files and null bytes", () => {
    for (const key of [
      "../.env",
      "tours/../../.env",
      "/etc/passwd",
      ".env",
      "tours/.hidden.webp",
      "tours//a.webp",
      "tours/a.webp\0.png",
      "tours\\..\\a.webp",
      "",
    ]) {
      expect(normalizeKey(key), key).toBeNull();
    }
  });

  it("returns null content type for non-image extensions", () => {
    expect(contentTypeForKey("tours/2026/01/x.txt")).toBeNull();
    expect(contentTypeForKey("tours/2026/01/x.svg")).toBeNull();
  });
});
