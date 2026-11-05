import { describe, expect, it } from "vitest";
import {
  canViewTour,
  canonicalJson,
  changedFields,
  copySlug,
  destinationAuditDetails,
  destinationChanges,
  destinationVersion,
  slugChangeBlocked,
  tourAuditDetails,
  tourChanges,
  tourRemovalBlocker,
  tourVersion,
  type EditableTour,
} from "./catalogue.rules";

const tour: EditableTour = {
  slug: "menyusuri-desa-manuaba",
  destinationId: 29,
  title: { id: "Menyusuri Desa Manuaba", en: "Walking Manuaba Village" },
  summary: { id: "Ringkas", en: "Short" },
  description: { id: "Deskripsi", en: "Description" },
  category: "village",
  durationDays: 1,
  durationHours: 3,
  pricePerPerson: 350000,
  maxParticipants: 10,
  meetingPoint: "Manuaba",
  coverImage: "/images/cover.webp",
  gallery: ["/images/a.webp"],
  highlights: [{ id: "Sawah", en: "Rice fields" }],
  included: [],
  difficulty: "easy",
  notIncluded: [],
  whatToBring: [],
  etiquette: [],
  itinerary: [{ title: { id: "Hari", en: "Day" }, description: { id: "Jalan", en: "Walk" } }],
};

describe("canonicalJson", () => {
  it("ignores object key order and treats undefined as null", () => {
    expect(canonicalJson({ id: "a", en: "b" })).toBe(canonicalJson({ en: "b", id: "a" }));
    expect(canonicalJson(undefined)).toBe(canonicalJson(null));
  });

  it("keeps array order significant", () => {
    expect(canonicalJson(["a", "b"])).not.toBe(canonicalJson(["b", "a"]));
  });
});

describe("changedFields", () => {
  it("lists only the keys whose values differ, in key order", () => {
    expect(
      changedFields(
        { a: 1, b: { id: "x", en: "y" }, c: 3 },
        { a: 2, b: { en: "y", id: "x" }, c: 4 },
        ["c", "b", "a"],
      ),
    ).toEqual(["c", "a"]);
  });
});

describe("tourVersion", () => {
  it("is stable for the same content, whatever the jsonb key order", () => {
    const fromDb = {
      ...tour,
      title: { en: "Walking Manuaba Village", id: "Menyusuri Desa Manuaba" },
      itinerary: [
        {
          id: 7,
          tourId: 58,
          day: 1,
          title: { en: "Day", id: "Hari" },
          description: { en: "Walk", id: "Jalan" },
        },
      ],
    };
    expect(tourVersion(fromDb)).toBe(tourVersion(tour));
    expect(tourVersion(tour)).toMatch(/^[0-9a-z]{14}$/);
  });

  it("changes when an edited field changes", () => {
    expect(tourVersion({ ...tour, pricePerPerson: 360000 })).not.toBe(tourVersion(tour));
    expect(
      tourVersion({
        ...tour,
        itinerary: [{ title: { id: "Hari", en: "Day" }, description: { id: "Lari", en: "Run" } }],
      }),
    ).not.toBe(tourVersion(tour));
  });

  it("ignores publish, featured and rating, which are not edited by the form", () => {
    const stored = { ...tour, isPublished: true, isFeatured: false, rating: 4.5, reviewCount: 3 };
    const toggled = { ...stored, isPublished: false, isFeatured: true, rating: 3, reviewCount: 4 };
    expect(tourVersion(toggled)).toBe(tourVersion(stored));
  });
});

describe("tourChanges and tourAuditDetails", () => {
  it("reports nothing when the form is saved unchanged", () => {
    expect(tourChanges(tour, { ...tour, isPublished: false } as EditableTour)).toEqual([]);
  });

  it("names changed fields and adds the price and old slug", () => {
    const after = { ...tour, slug: "desa-manuaba", pricePerPerson: 35000, gallery: [] };
    const fields = tourChanges(tour, after);
    expect(fields).toEqual(["slug", "pricePerPerson", "gallery"]);
    expect(tourAuditDetails(tour, after, fields)).toEqual({
      slug: "desa-manuaba",
      fields: ["slug", "pricePerPerson", "gallery"],
      price: "350000 → 35000",
      previousSlug: "menyusuri-desa-manuaba",
    });
  });

  it("leaves out price and previous slug when they did not change", () => {
    const after = { ...tour, meetingPoint: "Balai banjar" };
    expect(tourAuditDetails(tour, after, tourChanges(tour, after))).toEqual({
      slug: "menyusuri-desa-manuaba",
      fields: ["meetingPoint"],
    });
  });
});

describe("canViewTour", () => {
  it("shows published tours to everyone", () => {
    expect(canViewTour(true, null)).toBe(true);
    expect(canViewTour(true, "user")).toBe(true);
  });

  it("shows drafts only to catalogue managers", () => {
    expect(canViewTour(false, null)).toBe(false);
    expect(canViewTour(false, "user")).toBe(false);
    expect(canViewTour(false, "partner")).toBe(false);
    expect(canViewTour(false, "staff")).toBe(true);
    expect(canViewTour(false, "admin")).toBe(true);
  });
});

describe("slugChangeBlocked", () => {
  it("blocks renaming a published tour", () => {
    expect(slugChangeBlocked({ isPublished: true, slug: "a" }, "b")).toBe(true);
  });

  it("allows keeping the slug, and renaming a draft", () => {
    expect(slugChangeBlocked({ isPublished: true, slug: "a" }, "a")).toBe(false);
    expect(slugChangeBlocked({ isPublished: false, slug: "a" }, "b")).toBe(false);
  });
});

describe("tourRemovalBlocker", () => {
  it("allows deleting an unused draft", () => {
    expect(tourRemovalBlocker({ isPublished: false, bookings: 0, reviews: 0 })).toBeNull();
  });

  it("refuses published tours first, then bookings, then reviews", () => {
    expect(tourRemovalBlocker({ isPublished: true, bookings: 2, reviews: 1 })).toBe("published");
    expect(tourRemovalBlocker({ isPublished: false, bookings: 1, reviews: 1 })).toBe("hasBookings");
    expect(tourRemovalBlocker({ isPublished: false, bookings: 0, reviews: 1 })).toBe("hasReviews");
  });
});

describe("copySlug", () => {
  it("appends -salinan", () => {
    expect(copySlug("melukat-di-beji")).toBe("melukat-di-beji-salinan");
  });

  it("stays within 80 characters without a double hyphen", () => {
    const long = `${"a".repeat(71)}-bcdefgh`;
    const slug = copySlug(long);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe(`${"a".repeat(71)}-salinan`);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe("destination rules", () => {
  const destination = {
    slug: "kenderan-manuaba",
    name: "Kenderan & Manuaba",
    province: "Bali",
    tagline: { id: "Desa", en: "Village" },
    description: { id: "D", en: "D" },
    heroImage: "/images/hero.webp",
    gettingThere: null,
  };

  it("versions and diffs the edited fields", () => {
    const after = { ...destination, name: "Kenderan", gettingThere: { id: "Ubud", en: "Ubud" } };
    expect(destinationVersion(after)).not.toBe(destinationVersion(destination));
    expect(destinationVersion({ ...destination, id: 3 } as typeof destination)).toBe(
      destinationVersion(destination),
    );
    const fields = destinationChanges(destination, after);
    expect(fields).toEqual(["name", "gettingThere"]);
    expect(destinationAuditDetails(destination, after, fields)).toEqual({
      slug: "kenderan-manuaba",
      fields: ["name", "gettingThere"],
    });
  });

  it("records the old slug when the address changes", () => {
    const after = { ...destination, slug: "kenderan" };
    expect(
      destinationAuditDetails(destination, after, destinationChanges(destination, after)),
    ).toEqual({
      slug: "kenderan",
      fields: ["slug"],
      previousSlug: "kenderan-manuaba",
    });
  });
});
