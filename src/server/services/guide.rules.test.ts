import { describe, expect, it } from "vitest";
import {
  inPartnerWindow,
  isGuideLanguage,
  isIsoDate,
  linkError,
  normalizeEmail,
  normalizeLanguages,
  normalizePhone,
  roleAfterUnlink,
} from "./guide.rules";

describe("normalizePhone", () => {
  it("turns Indonesian national numbers into E.164", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("+6281234567890");
    expect(normalizePhone("62 812 3456 7890")).toBe("+6281234567890");
    expect(normalizePhone("+62 (812) 3456.7890")).toBe("+6281234567890");
  });

  it("keeps international numbers and converts a 00 prefix", () => {
    expect(normalizePhone("+31 20 123 4567")).toBe("+31201234567");
    expect(normalizePhone("0031201234567")).toBe("+31201234567");
  });

  it("rejects letters, too short or too long numbers", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
    expect(normalizePhone("0812abc")).toBeNull();
    expect(normalizePhone("+12345")).toBeNull();
    expect(normalizePhone("+1234567890123456")).toBeNull();
    expect(normalizePhone("+0812345678")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Wayan@Example.ID ")).toBe("wayan@example.id");
  });
});

describe("normalizeLanguages", () => {
  it("keeps known codes once, lowercase, in catalogue order", () => {
    expect(normalizeLanguages(["EN", "id", "en", " ja "])).toEqual(["id", "en", "ja"]);
  });

  it("recognises catalogue codes only", () => {
    expect(isGuideLanguage("ja")).toBe(true);
    expect(isGuideLanguage("xx")).toBe(false);
  });

  it("drops unknown codes", () => {
    expect(normalizeLanguages(["xx", "klingon", "ko"])).toEqual(["ko"]);
    expect(normalizeLanguages([])).toEqual([]);
  });
});

describe("linkError", () => {
  const account = { id: "u1", role: "user" as const, disabledAt: null };
  const base = { guideId: 1, guideUserId: null, account, accountGuideId: null };

  it("allows a traveller account that is not linked yet", () => {
    expect(linkError(base)).toBeNull();
  });

  it("allows an unlinked partner account", () => {
    expect(linkError({ ...base, account: { ...account, role: "partner" } })).toBeNull();
  });

  it("refuses back-office accounts", () => {
    expect(linkError({ ...base, account: { ...account, role: "staff" } })).toBe(
      "guideAccountBackoffice",
    );
    expect(linkError({ ...base, account: { ...account, role: "admin" } })).toBe(
      "guideAccountBackoffice",
    );
  });

  it("refuses disabled accounts", () => {
    expect(linkError({ ...base, account: { ...account, disabledAt: new Date() } })).toBe(
      "guideAccountDisabled",
    );
  });

  it("refuses an account already linked to another guide", () => {
    expect(linkError({ ...base, accountGuideId: 2 })).toBe("guideAccountLinked");
  });

  it("refuses when the guide already has a different account", () => {
    expect(linkError({ ...base, guideUserId: "u2" })).toBe("guideAlreadyLinked");
  });

  it("never turns a back-office account back into a partner, even when already linked", () => {
    expect(
      linkError({
        ...base,
        guideUserId: "u1",
        accountGuideId: 1,
        account: { ...account, role: "staff" },
      }),
    ).toBe("guideAccountBackoffice");
  });

  it("treats re-linking the same pair as allowed", () => {
    expect(
      linkError({
        ...base,
        guideUserId: "u1",
        accountGuideId: 1,
        account: { ...account, role: "partner" },
      }),
    ).toBeNull();
  });
});

describe("roleAfterUnlink", () => {
  it("returns partners to traveller and keeps other roles", () => {
    expect(roleAfterUnlink("partner")).toBe("user");
    expect(roleAfterUnlink("user")).toBe("user");
    expect(roleAfterUnlink("staff")).toBe("staff");
  });
});

describe("partner window", () => {
  it("validates calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("../etc")).toBe(false);
  });

  it("includes dates from the oldest visible day onwards", () => {
    expect(inPartnerWindow("2026-08-03", "2026-08-03")).toBe(true);
    expect(inPartnerWindow("2027-01-01", "2026-08-03")).toBe(true);
    expect(inPartnerWindow("2026-08-02", "2026-08-03")).toBe(false);
    expect(inPartnerWindow("nope", "2026-08-03")).toBe(false);
  });
});
