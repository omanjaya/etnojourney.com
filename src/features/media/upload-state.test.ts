import { describe, expect, it } from "vitest";
import { anyUploading, setUploading } from "./upload-state";

describe("upload state", () => {
  it("is idle until an uploader starts", () => {
    expect(anyUploading({})).toBe(false);
    expect(anyUploading(setUploading({}, "coverImage", true))).toBe(true);
  });

  it("stays busy while any uploader is still working", () => {
    let state = setUploading({}, "coverImage", true);
    state = setUploading(state, "gallery", true);
    state = setUploading(state, "coverImage", false);
    expect(anyUploading(state)).toBe(true);
    state = setUploading(state, "gallery", false);
    expect(anyUploading(state)).toBe(false);
  });

  it("ignores an idle report on mount", () => {
    const busy = setUploading({}, "gallery", true);
    expect(anyUploading(setUploading(busy, "coverImage", false))).toBe(true);
  });

  it("returns the same state when nothing changes", () => {
    const state = setUploading({}, "gallery", true);
    expect(setUploading(state, "gallery", true)).toBe(state);
    const idle = {};
    expect(setUploading(idle, "gallery", false)).toBe(idle);
  });
});
