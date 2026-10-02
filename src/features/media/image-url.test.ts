import { describe, expect, it } from "vitest";
import { isAllowedImageSource, previewSrc } from "./image-url";

describe("isAllowedImageSource", () => {
  it("accepts Unsplash CDN URLs and generated upload paths", () => {
    expect(isAllowedImageSource("https://images.unsplash.com/photo-1?w=1600")).toBe(true);
    expect(
      isAllowedImageSource("/media/tours/2026/10/3f2b8c1e-9a4d-4c2b-8f1e-2a3b4c5d6e7f.webp"),
    ).toBe(true);
  });

  it("rejects other hosts, schemes and hand-written media paths", () => {
    for (const value of [
      "http://images.unsplash.com/photo-1",
      "https://images.unsplash.com.evil.com/photo-1",
      "https://evil.com/?https://images.unsplash.com/",
      "javascript:alert(1)",
      "/media/../.env",
      "/media/tours/2026/10/x.webp",
      "/media/tours/2026/10/3f2b8c1e-9a4d-4c2b-8f1e-2a3b4c5d6e7f.svg",
      "",
    ]) {
      expect(isAllowedImageSource(value), value).toBe(false);
    }
  });

  it("only rewrites Unsplash URLs for previews", () => {
    expect(previewSrc("https://images.unsplash.com/photo-1?w=1600", 400)).toBe(
      "https://images.unsplash.com/photo-1?w=400&q=70&auto=format&fit=crop",
    );
    expect(previewSrc("/media/tours/a.webp")).toBe("/media/tours/a.webp");
  });
});

describe("curated content images", () => {
  it("accepts shipped content photos and rejects traversal or other formats", () => {
    expect(isAllowedImageSource("/images/content/tana-toraja/tongkonan.webp")).toBe(true);
    expect(isAllowedImageSource("/images/content/../.env")).toBe(false);
    expect(isAllowedImageSource("/images/content/x/photo.jpg")).toBe(false);
  });
});
