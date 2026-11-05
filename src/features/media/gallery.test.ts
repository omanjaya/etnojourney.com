import { describe, expect, it } from "vitest";
import {
  appendPhoto,
  galleryKeys,
  movePhoto,
  moveToFront,
  removePhoto,
  replacePhoto,
  swapCoverInGallery,
} from "./gallery";

describe("galleryKeys", () => {
  it("uses the URL so a moved photo keeps its key", () => {
    expect(galleryKeys(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(galleryKeys(["b", "a", "c"])).toEqual(["b", "a", "c"]);
  });

  it("keeps keys unique when the same photo appears twice", () => {
    expect(galleryKeys(["a", "b", "a", "a"])).toEqual(["a", "b", "a#1", "a#2"]);
  });
});

describe("movePhoto", () => {
  it("swaps with the neighbour", () => {
    expect(movePhoto(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(movePhoto(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });

  it("returns the same list at the edges", () => {
    const urls = ["a", "b"];
    expect(movePhoto(urls, 0, -1)).toBe(urls);
    expect(movePhoto(urls, 1, 1)).toBe(urls);
    expect(movePhoto(urls, 5, 1)).toBe(urls);
  });
});

describe("moveToFront", () => {
  it("moves the photo to the first position and keeps the rest in order", () => {
    expect(moveToFront(["a", "b", "c", "d"], 2)).toEqual(["c", "a", "b", "d"]);
  });

  it("returns the same list when the photo is already first or missing", () => {
    const urls = ["a", "b"];
    expect(moveToFront(urls, 0)).toBe(urls);
    expect(moveToFront(urls, 4)).toBe(urls);
  });
});

describe("removePhoto", () => {
  it("removes one photo by position", () => {
    expect(removePhoto(["a", "b", "a"], 2)).toEqual(["a", "b"]);
  });

  it("ignores positions outside the list", () => {
    const urls = ["a"];
    expect(removePhoto(urls, 3)).toBe(urls);
  });
});

describe("appendPhoto", () => {
  it("adds at the end until the gallery is full", () => {
    expect(appendPhoto(["a"], "b", 2)).toEqual(["a", "b"]);
    const full = ["a", "b"];
    expect(appendPhoto(full, "c", 2)).toBe(full);
  });
});

describe("replacePhoto", () => {
  it("replaces the photo at its original position", () => {
    expect(replacePhoto(["a", "b", "c"], { index: 1, url: "b" }, "new")).toEqual([
      "a",
      "new",
      "c",
    ]);
  });

  it("follows the photo when it was moved during the upload", () => {
    expect(replacePhoto(["b", "a", "c"], { index: 1, url: "b" }, "new")).toEqual([
      "new",
      "a",
      "c",
    ]);
  });

  it("prefers the original position when the photo appears twice", () => {
    expect(replacePhoto(["a", "b", "a"], { index: 2, url: "a" }, "new")).toEqual([
      "a",
      "b",
      "new",
    ]);
  });

  it("changes nothing when the photo was removed meanwhile", () => {
    const urls = ["a", "c"];
    expect(replacePhoto(urls, { index: 1, url: "b" }, "new")).toBe(urls);
  });
});

describe("swapCoverInGallery", () => {
  it("replaces the old cover's copy in the gallery", () => {
    expect(swapCoverInGallery(["old", "b", "c"], "old", "new")).toEqual(["new", "b", "c"]);
    expect(swapCoverInGallery(["a", "old"], "old", "new")).toEqual(["a", "new"]);
  });

  it("leaves the gallery alone when the old cover is not in it", () => {
    const gallery = ["a", "b"];
    expect(swapCoverInGallery(gallery, "old", "new")).toBe(gallery);
  });

  it("leaves the gallery alone when the new cover is already a gallery photo", () => {
    const gallery = ["old", "new"];
    expect(swapCoverInGallery(gallery, "old", "new")).toBe(gallery);
  });

  it("does nothing when the cover is removed or unchanged", () => {
    const gallery = ["old", "b"];
    expect(swapCoverInGallery(gallery, "old", "")).toBe(gallery);
    expect(swapCoverInGallery(gallery, "", "new")).toBe(gallery);
    expect(swapCoverInGallery(gallery, "old", "old")).toBe(gallery);
  });
});
