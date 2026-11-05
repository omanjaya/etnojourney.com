import { describe, expect, it } from "vitest";
import { ORPHAN_UPLOAD_GRACE_MS, orphanUploadKeys, uploadUrl } from "./media.rules";

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

describe("uploadUrl", () => {
  it("matches the URL the upload action returns", () => {
    expect(uploadUrl("tours/2026/11/x.webp")).toBe("/media/tours/2026/11/x.webp");
  });
});
