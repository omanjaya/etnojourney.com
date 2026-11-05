import { describe, expect, it } from "vitest";
import { MAX_PIXELS, MAX_UPLOAD_BYTES } from "@/server/storage/image-validation";
import { downscaleSize, heroPhotoNotice, MIN_HERO_WIDTH, needsDownscale } from "./image-rules";

describe("needsDownscale", () => {
  it("leaves normal phone photos untouched", () => {
    expect(needsDownscale(4 * 1024 * 1024, { width: 4032, height: 3024 })).toBe(false);
    expect(needsDownscale(MAX_UPLOAD_BYTES, { width: 6000, height: 4000 })).toBe(false);
  });

  it("shrinks files the server would refuse for their size", () => {
    expect(needsDownscale(MAX_UPLOAD_BYTES + 1, { width: 4000, height: 3000 })).toBe(true);
    expect(needsDownscale(20 * 1024 * 1024, null)).toBe(true);
  });

  it("shrinks photos over the pixel limit, such as 48 MP phone shots", () => {
    expect(needsDownscale(2 * 1024 * 1024, { width: 8064, height: 6048 })).toBe(true);
  });

  it("does not shrink a small file whose size could not be read", () => {
    expect(needsDownscale(1024, null)).toBe(false);
  });
});

describe("downscaleSize", () => {
  it("caps the width at 2400 px and keeps the aspect ratio", () => {
    expect(downscaleSize({ width: 8064, height: 6048 })).toEqual({ width: 2400, height: 1800 });
  });

  it("keeps a portrait photo's width rule (height follows)", () => {
    expect(downscaleSize({ width: 6048, height: 8064 })).toEqual({ width: 2400, height: 3200 });
  });

  it("also caps the pixel count for very tall images", () => {
    const size = downscaleSize({ width: 2000, height: 40_000 });
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_PIXELS / 2);
    expect(size.width).toBeLessThan(2000);
  });

  it("never enlarges", () => {
    expect(downscaleSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });
});

describe("heroPhotoNotice", () => {
  it("accepts a large landscape photo", () => {
    expect(heroPhotoNotice({ width: 2400, height: 1600 })).toBeNull();
    expect(heroPhotoNotice({ width: MIN_HERO_WIDTH, height: 900 })).toBeNull();
  });

  it("warns about upright and square photos", () => {
    expect(heroPhotoNotice({ width: 900, height: 1600 })).toBe("notLandscape");
    expect(heroPhotoNotice({ width: 2000, height: 2000 })).toBe("notLandscape");
  });

  it("warns about small photos, such as ones forwarded over WhatsApp", () => {
    expect(heroPhotoNotice({ width: 1280, height: 720 })).toBe("small");
    expect(heroPhotoNotice({ width: 160, height: 90 })).toBe("small");
  });
});
