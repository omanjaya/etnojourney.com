import { describe, expect, it } from "vitest";
import {
  creditDeletionBlocker,
  isPlaceholderCredit,
  isSitePhoto,
  knownCreditText,
} from "./photo-credit.rules";

describe("isPlaceholderCredit", () => {
  it("recognises the AI placeholder license from content/README.md", () => {
    expect(isPlaceholderCredit({ license: "Placeholder, not the real place" })).toBe(true);
    expect(isPlaceholderCredit({ license: "  placeholder" })).toBe(true);
  });

  it("does not flag real licenses", () => {
    expect(isPlaceholderCredit({ license: "CC BY-SA 4.0" })).toBe(false);
    expect(isPlaceholderCredit({ license: "Hak cipta pemilik" })).toBe(false);
  });
});

describe("isSitePhoto", () => {
  it("covers the photos referenced from code", () => {
    expect(isSitePhoto("/images/content/site/hero-ulun-danu.webp")).toBe(true);
    expect(isSitePhoto("/images/content/bali/ulun-danu.webp")).toBe(false);
  });
});

describe("creditDeletionBlocker", () => {
  const upload = "/media/tours/2026/11/0ddeb63d-0000-4000-8000-000000000000.webp";

  it("allows deleting the credit of an upload the site no longer uses", () => {
    expect(creditDeletionBlocker({ path: upload, inUse: false })).toBeNull();
  });

  it("keeps credits of photos still in use", () => {
    expect(creditDeletionBlocker({ path: upload, inUse: true })).toBe("inUse");
    expect(
      creditDeletionBlocker({ path: "/images/content/site/borobudur-walk.webp", inUse: false }),
    ).toBe("inUse");
  });

  it("keeps curated content credits, which the content sync would restore", () => {
    expect(
      creditDeletionBlocker({
        path: "/images/content/kenderan-manuaba/canang-sari.webp",
        inUse: false,
      }),
    ).toBe("notUpload");
  });
});

describe("knownCreditText", () => {
  it("maps the English wording of the content files to message keys", () => {
    expect(knownCreditText("AI illustration")).toBe("aiIllustration");
    expect(knownCreditText("Placeholder, not the real place")).toBe("placeholder");
    expect(knownCreditText("Public domain")).toBe("publicDomain");
    expect(knownCreditText("Unsplash License")).toBe("unsplash");
  });

  it("leaves names and license names as they are", () => {
    expect(knownCreditText("CC BY-SA 4.0")).toBeNull();
    expect(knownCreditText("Pak Made")).toBeNull();
    expect(knownCreditText("toString")).toBeNull();
  });
});
