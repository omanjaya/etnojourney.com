import { describe, expect, it } from "vitest";
import {
  parseAdminBookingQuery,
  parseAdminListQuery,
  destinationFormSchema,
  tourFormSchema,
} from "./schemas";

describe("parseAdminBookingQuery", () => {
  it("keeps valid params", () => {
    expect(
      parseAdminBookingQuery({
        q: "  EJ-ABC  ",
        status: "pending",
        from: "2026-10-01",
        to: "2026-12-31",
        sort: "travel",
      }),
    ).toEqual({
      q: "EJ-ABC",
      status: "pending",
      from: "2026-10-01",
      to: "2026-12-31",
      sort: "travel",
    });
  });

  it("drops invalid params individually", () => {
    expect(
      parseAdminBookingQuery({
        q: "nadia",
        status: "shipped",
        from: "2026-02-30",
        to: "tomorrow",
        sort: "price",
      }),
    ).toEqual({ q: "nadia" });
  });

  it("swaps a reversed date range and takes the first of repeated params", () => {
    expect(parseAdminBookingQuery({ from: "2026-12-01", to: "2026-10-01" })).toMatchObject({
      from: "2026-10-01",
      to: "2026-12-01",
    });
    expect(parseAdminBookingQuery({ status: ["confirmed", "pending"] })).toEqual({
      status: "confirmed",
    });
  });

  it("ignores empty or oversized search text", () => {
    expect(parseAdminBookingQuery({ q: "   " })).toEqual({});
    expect(parseAdminBookingQuery({ q: "x".repeat(101) })).toEqual({});
  });
});

describe("parseAdminListQuery", () => {
  it("reads q and ignores everything else", () => {
    expect(parseAdminListQuery({ q: "ubud", page: "2" })).toEqual({ q: "ubud" });
    expect(parseAdminListQuery({})).toEqual({});
  });
});

const text = (id: string, en = id) => ({ id, en });

const validTour = {
  slug: "uji-coba",
  destinationId: 1,
  title: text("Judul"),
  summary: text("Ringkasan"),
  description: text("Deskripsi"),
  category: "village",
  durationDays: 1,
  pricePerPerson: 500_000,
  maxParticipants: 8,
  meetingPoint: "Lapangan desa",
  coverImage: "/images/content/ubud/cover.webp",
  gallery: [],
  highlights: [],
  included: [],
  difficulty: "moderate",
  notIncluded: [text("Tiket pesawat", "Flights")],
  whatToBring: [],
  etiquette: [],
  isPublished: true,
  isFeatured: false,
  itinerary: [{ title: text("Hari 1"), description: text("Kegiatan") }],
};

describe("tourFormSchema practical info", () => {
  it("accepts a difficulty and bilingual lists", () => {
    expect(tourFormSchema.safeParse(validTour).success).toBe(true);
  });

  it("rejects unknown difficulty and lists over their limits", () => {
    expect(tourFormSchema.safeParse({ ...validTour, difficulty: "extreme" }).success).toBe(false);
    const tooMany = Array.from({ length: 7 }, (_, i) => text(`a${i}`));
    expect(tourFormSchema.safeParse({ ...validTour, notIncluded: tooMany }).success).toBe(false);
    expect(tourFormSchema.safeParse({ ...validTour, etiquette: tooMany }).success).toBe(false);
    expect(
      tourFormSchema.safeParse({ ...validTour, whatToBring: [...tooMany, text("b"), text("c")] })
        .success,
    ).toBe(false);
  });

  it("rejects a list item missing one locale", () => {
    expect(
      tourFormSchema.safeParse({ ...validTour, whatToBring: [{ id: "Topi", en: "" }] }).success,
    ).toBe(false);
  });
});

const validDestination = {
  slug: "uji",
  name: "Uji",
  province: "Bali",
  tagline: text("Tagline"),
  description: text("Deskripsi"),
  heroImage: "/images/content/ubud/cover.webp",
};

describe("destinationFormSchema gettingThere", () => {
  it("treats both locales empty as not set", () => {
    const parsed = destinationFormSchema.parse({ ...validDestination, gettingThere: text("") });
    expect(parsed.gettingThere).toBeNull();
  });

  it("keeps a bilingual value", () => {
    const parsed = destinationFormSchema.parse({
      ...validDestination,
      gettingThere: text("Dari bandara", "From the airport"),
    });
    expect(parsed.gettingThere).toEqual({ id: "Dari bandara", en: "From the airport" });
  });

  it("requires both locales once one is filled", () => {
    expect(
      destinationFormSchema.safeParse({ ...validDestination, gettingThere: text("Ada", "") })
        .success,
    ).toBe(false);
  });
});
