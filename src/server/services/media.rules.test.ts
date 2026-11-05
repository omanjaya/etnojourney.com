import { describe, expect, it } from "vitest";
import {
  isSafeOrphanCleanup,
  ORPHAN_UPLOAD_GRACE_MS,
  orphanUploadKeys,
  uploadUrl,
} from "./media.rules";

const now = new Date("2026-11-05T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const old = ago(ORPHAN_UPLOAD_GRACE_MS + 1);

describe("orphanUploadKeys", () => {
  it("returns old uploads nothing uses", () => {
    const files = [
      { key: "tours/2026/10/a.webp", modifiedAt: old },
      { key: "tours/2026/10/b.webp", modifiedAt: old },
    ];
    const used = new Set([uploadUrl("tours/2026/10/a.webp")]);
    expect(orphanUploadKeys(files, used, now)).toEqual(["tours/2026/10/b.webp"]);
  });

  it("keeps recent uploads, which an open form may still save", () => {
    const files = [{ key: "tours/2026/11/new.webp", modifiedAt: ago(60 * 60 * 1000) }];
    expect(orphanUploadKeys(files, new Set(), now)).toEqual([]);
  });

  it("deletes exactly at the end of the grace period", () => {
    const files = [{ key: "tours/2026/11/edge.webp", modifiedAt: ago(ORPHAN_UPLOAD_GRACE_MS) }];
    expect(orphanUploadKeys(files, new Set(), now)).toEqual(["tours/2026/11/edge.webp"]);
  });
});

describe("isSafeOrphanCleanup", () => {
  it("allows normal cleanups", () => {
    expect(isSafeOrphanCleanup(0, 0)).toBe(true);
    expect(isSafeOrphanCleanup(40, 5)).toBe(true);
    expect(isSafeOrphanCleanup(40, 20)).toBe(true);
    expect(isSafeOrphanCleanup(4, 3)).toBe(true);
  });

  it("refuses to delete most or all of the library at once", () => {
    expect(isSafeOrphanCleanup(40, 21)).toBe(false);
    expect(isSafeOrphanCleanup(40, 40)).toBe(false);
    expect(isSafeOrphanCleanup(4, 4)).toBe(false);
  });
});

describe("uploadUrl", () => {
  it("matches the URL the upload action returns", () => {
    expect(uploadUrl("tours/2026/11/x.webp")).toBe("/media/tours/2026/11/x.webp");
  });
});
