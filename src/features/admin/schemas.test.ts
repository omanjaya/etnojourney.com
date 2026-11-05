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
  included: [text("Makan siang", "Lunch")],
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

describe("tourFormSchema duration in hours", () => {
  it("treats an empty hours field as a full day", () => {
    const parsed = tourFormSchema.safeParse({ ...validTour, durationHours: "" });
    expect(parsed.success && parsed.data.durationHours).toBe(null);
  });

  it("accepts hours on a same-day tour", () => {
    const parsed = tourFormSchema.safeParse({ ...validTour, durationHours: 4 });
    expect(parsed.success && parsed.data.durationHours).toBe(4);
  });

  it("rejects hours on a multi-day tour or outside 1-12", () => {
    expect(
      tourFormSchema.safeParse({ ...validTour, durationDays: 2, durationHours: 4 }).success,
    ).toBe(false);
    expect(tourFormSchema.safeParse({ ...validTour, durationHours: 13 }).success).toBe(false);
    expect(tourFormSchema.safeParse({ ...validTour, durationHours: 0 }).success).toBe(false);
  });
});

/** Issue messages per dotted path, e.g. `{ "title.en": ["englishRequired"] }`. */
function tourIssues(input: Record<string, unknown>) {
  const parsed = tourFormSchema.safeParse(input);
  if (parsed.success) return {};
  const byPath: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    (byPath[issue.path.join(".")] ??= []).push(issue.message);
  }
  return byPath;
}

describe("tourFormSchema messages", () => {
  it("rejects a price typed in thousands and an absurdly high one", () => {
    expect(tourIssues({ ...validTour, pricePerPerson: 450 })).toEqual({
      pricePerPerson: ["priceMin"],
    });
    expect(tourIssues({ ...validTour, pricePerPerson: 0 })).toEqual({
      pricePerPerson: ["priceMin"],
    });
    expect(tourIssues({ ...validTour, pricePerPerson: 1_000_000_001 })).toEqual({
      pricePerPerson: ["priceMax"],
    });
    expect(tourFormSchema.safeParse({ ...validTour, pricePerPerson: 10_000 }).success).toBe(true);
  });

  it("asks to choose an unselected destination, category or difficulty", () => {
    expect(
      tourIssues({ ...validTour, destinationId: 0, category: undefined, difficulty: "" }),
    ).toEqual({ destinationId: ["choose"], category: ["choose"], difficulty: ["choose"] });
  });

  it("names the range in number errors", () => {
    expect(tourIssues({ ...validTour, maxParticipants: 150 })).toEqual({
      maxParticipants: ["maxParticipants"],
    });
    expect(tourIssues({ ...validTour, durationHours: 2.5 })).toEqual({
      durationHours: ["durationHours"],
    });
  });

  it("says when only the English side is missing, and states text limits", () => {
    expect(tourIssues({ ...validTour, title: text("Judul", " ") })).toEqual({
      "title.en": ["englishRequired"],
    });
    expect(tourIssues({ ...validTour, title: text("", "Title") })).toEqual({
      "title.id": ["required"],
    });
    expect(tourIssues({ ...validTour, summary: text("a".repeat(301), "b") })).toEqual({
      "summary.id": ["tooLong"],
    });
  });

  it("reports differing ID and EN line counts and too many lines", () => {
    expect(tourIssues({ ...validTour, highlights: [text("Satu"), { id: "Dua", en: "" }] })).toEqual(
      { "highlights.1.en": ["linesMismatch"] },
    );
    const sevenLines = Array.from({ length: 7 }, (_, i) => text(`a${i}`));
    expect(tourIssues({ ...validTour, notIncluded: sevenLines })).toEqual({
      notIncluded: ["tooManyLines"],
    });
    expect(tourIssues({ ...validTour, etiquette: [text("a".repeat(201), "b")] })).toEqual({
      "etiquette.0.id": ["lineTooLong"],
    });
  });

  it("requires at least one included item", () => {
    expect(tourIssues({ ...validTour, included: [] })).toEqual({
      included: ["includedRequired"],
    });
  });
});

describe("tourFormSchema itinerary days", () => {
  const day = { title: text("Hari"), description: text("Kegiatan") };

  it("needs one itinerary entry per day of the duration", () => {
    expect(tourIssues({ ...validTour, durationDays: 3 })).toEqual({
      itinerary: ["itineraryDays"],
    });
    expect(tourIssues({ ...validTour, itinerary: [day, day] })).toEqual({
      itinerary: ["itineraryDays"],
    });
    expect(
      tourFormSchema.safeParse({ ...validTour, durationDays: 2, itinerary: [day, day] }).success,
    ).toBe(true);
  });

  it("reports an empty itinerary as a day-count problem", () => {
    // Both the minimum and the per-day check fire; parseInput shows the message once.
    const issues = tourIssues({ ...validTour, itinerary: [] });
    expect(Object.keys(issues)).toEqual(["itinerary"]);
    expect(new Set(issues.itinerary)).toEqual(new Set(["itineraryDays"]));
  });

  it("points at the exact day field that is missing English", () => {
    const missing = { title: text("Hari 1"), description: { id: "Kegiatan", en: "" } };
    expect(tourIssues({ ...validTour, itinerary: [missing] })).toEqual({
      "itinerary.0.description.en": ["englishRequired"],
    });
  });
});

describe("tourFormSchema cross-field checks", () => {
  it("runs while unrelated fields still fail", () => {
    const issues = tourIssues({
      ...validTour,
      category: undefined,
      durationDays: 2,
      durationHours: 3,
    });
    expect(issues).toEqual({
      category: ["choose"],
      durationHours: ["durationHoursSameDay"],
      itinerary: ["itineraryDays"],
    });
  });

  it("waits for the fields they read", () => {
    expect(tourIssues({ ...validTour, durationDays: "", durationHours: 3 })).toEqual({
      durationDays: ["durationDays"],
    });
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
