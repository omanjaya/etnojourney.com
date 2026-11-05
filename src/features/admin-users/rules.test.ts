import { describe, expect, it } from "vitest";
import { auditDetails, auditEntityHref, auditEntityName, auditTourScope } from "./rules";

describe("auditEntityHref", () => {
  it("links bookings and payments by their code", () => {
    expect(
      auditEntityHref({ entityType: "booking", entityId: "7", details: { code: "EJ-ABC234" } }),
    ).toBe("/admin/bookings/EJ-ABC234");
    expect(
      auditEntityHref({ entityType: "payment", entityId: "3", details: { code: "EJ-ABC234" } }),
    ).toBe("/admin/bookings/EJ-ABC234");
  });

  it("has no booking link without a valid code", () => {
    expect(auditEntityHref({ entityType: "booking", entityId: "7", details: null })).toBeNull();
    expect(
      auditEntityHref({ entityType: "booking", entityId: "7", details: { code: "../../x" } }),
    ).toBeNull();
  });

  it("links tours, destinations and users to their admin pages", () => {
    expect(auditEntityHref({ entityType: "tour", entityId: "12", details: null })).toBe(
      "/admin/tours/12/edit",
    );
    expect(auditEntityHref({ entityType: "destination", entityId: "4", details: null })).toBe(
      "/admin/destinations/4/edit",
    );
    expect(auditEntityHref({ entityType: "user", entityId: "aB3_x-9", details: null })).toBe(
      "/admin/users/aB3_x-9",
    );
    expect(auditEntityHref({ entityType: "guide", entityId: "3", details: null })).toBe(
      "/admin/guides/3/edit",
    );
    expect(auditEntityHref({ entityType: "guide", entityId: "3/../x", details: null })).toBeNull();
  });

  it("refuses ids that could escape the path", () => {
    expect(
      auditEntityHref({ entityType: "tour", entityId: "1/../../x", details: null }),
    ).toBeNull();
    expect(auditEntityHref({ entityType: "user", entityId: "a/b", details: null })).toBeNull();
  });

  it("does not link deleted tours and destinations (their page is gone)", () => {
    expect(
      auditEntityHref({
        action: "destination.deleted",
        entityType: "destination",
        entityId: "30",
        details: { slug: "uji", name: "Uji" },
      }),
    ).toBeNull();
    expect(
      auditEntityHref({
        action: "tour.deleted",
        entityType: "tour",
        entityId: "63",
        details: null,
      }),
    ).toBeNull();
    expect(
      auditEntityHref({
        action: "tour.updated",
        entityType: "tour",
        entityId: "63",
        details: null,
      }),
    ).toBe("/admin/tours/63/edit");
  });

  it("returns null for entities without a page", () => {
    expect(auditEntityHref({ entityType: "review", entityId: "1", details: null })).toBeNull();
    expect(auditEntityHref({ entityType: "closure", entityId: "1", details: null })).toBeNull();
    expect(auditEntityHref({ entityType: "credit", entityId: "x", details: null })).toBeNull();
  });

  it("links a review to the moderation list, found by its author", () => {
    expect(
      auditEntityHref({
        entityType: "review",
        entityId: "26",
        details: { author: "Ni Made & Co" },
      }),
    ).toBe("/admin/reviews?q=Ni%20Made%20%26%20Co");
    expect(
      auditEntityHref({
        entityType: "review",
        entityId: "26",
        details: { author: "x".repeat(81) },
      }),
    ).toBeNull();
  });

  it("links a closure range to the availability calendar of its first month", () => {
    expect(
      auditEntityHref({
        entityType: "closure",
        entityId: "12:2027-01-01..2027-01-31",
        details: null,
      }),
    ).toBe("/admin/availability?tour=12&month=2027-01");
    expect(
      auditEntityHref({
        entityType: "closure",
        entityId: "all:2027-03-19..2027-03-19",
        details: null,
      }),
    ).toBe("/admin/availability?month=2027-03");
    expect(
      auditEntityHref({
        entityType: "closure",
        entityId: "x:2027-01-01..2027-01-31",
        details: null,
      }),
    ).toBeNull();
  });
});

describe("auditEntityName", () => {
  it("prefers the booking code, then the stored name", () => {
    expect(
      auditEntityName({ entityType: "booking", entityId: "7", details: { code: "EJ-ABC234" } }),
    ).toEqual({ kind: "text", value: "EJ-ABC234" });
    expect(
      auditEntityName({ entityType: "user", entityId: "CIaYo7V6", details: null }, "Budi"),
    ).toEqual({ kind: "text", value: "Budi" });
  });

  it("names tours by slug, guides by name and reviews by author", () => {
    expect(
      auditEntityName({ entityType: "tour", entityId: "58", details: { slug: "desa-manuaba" } }),
    ).toEqual({ kind: "text", value: "desa-manuaba" });
    expect(
      auditEntityName({ entityType: "guide", entityId: "3", details: { name: "Wayan" } }),
    ).toEqual({ kind: "text", value: "Wayan" });
    expect(
      auditEntityName({ entityType: "review", entityId: "26", details: { author: "Sari" } }),
    ).toEqual({ kind: "text", value: "Sari" });
  });

  it("names departures and closures by their dates", () => {
    expect(
      auditEntityName({ entityType: "departure", entityId: "66:2026-12-10", details: null }),
    ).toEqual({ kind: "date", value: "2026-12-10" });
    expect(
      auditEntityName({
        entityType: "closure",
        entityId: "all:2027-01-01..2027-01-31",
        details: { from: "2027-01-01", to: "2027-01-31" },
      }),
    ).toEqual({ kind: "dateRange", from: "2027-01-01", to: "2027-01-31" });
    expect(
      auditEntityName({ entityType: "closure", entityId: "41", details: { date: "2027-01-05" } }),
    ).toEqual({ kind: "date", value: "2027-01-05" });
  });

  it("returns null when only the id is known", () => {
    expect(auditEntityName({ entityType: "user", entityId: "CIaYo7V6", details: null })).toBeNull();
    expect(auditEntityName({ entityType: "review", entityId: "26", details: null })).toBeNull();
  });
});

describe("auditTourScope", () => {
  const title = { id: "Menyusuri Desa", en: "Village Walk" };

  it("names the tour of a departure or closure from its stored tour id", () => {
    expect(
      auditTourScope(
        { entityType: "departure", entityId: "66:2026-12-10", details: { tourId: 66 } },
        title,
      ),
    ).toEqual({ kind: "tour", title });
    expect(
      auditTourScope(
        { entityType: "closure", entityId: "66:2027-01-01..2027-01-31", details: { tourId: 66 } },
        title,
      ),
    ).toEqual({ kind: "tour", title });
  });

  it("tells an all-tours closure apart from a closure of one tour", () => {
    expect(
      auditTourScope(
        {
          entityType: "closure",
          entityId: "all:2027-01-01..2027-01-31",
          details: { tourId: null },
        },
        null,
      ),
    ).toEqual({ kind: "all" });
    // Older per-day entries stored the same shape under a numeric id.
    expect(
      auditTourScope({ entityType: "closure", entityId: "41", details: { tourId: null } }),
    ).toEqual({ kind: "all" });
  });

  it("returns null for other entries, unknown tours and missing tour ids", () => {
    expect(
      auditTourScope({ entityType: "tour", entityId: "66", details: { tourId: 66 } }, title),
    ).toBeNull();
    expect(
      auditTourScope({
        entityType: "departure",
        entityId: "66:2026-12-10",
        details: { tourId: 66 },
      }),
    ).toBeNull();
    expect(
      auditTourScope({ entityType: "departure", entityId: "66:2026-12-10", details: null }, title),
    ).toBeNull();
    expect(
      auditTourScope({
        entityType: "departure",
        entityId: "66:2026-12-10",
        details: { tourId: null },
      }),
    ).toBeNull();
  });
});

describe("auditDetails", () => {
  it("drops internal ids, developer values and what names the item", () => {
    expect(
      auditDetails("departure.assigned", {
        tourId: 66,
        date: "2026-12-10",
        guideId: 3,
        guideName: "Wayan",
        previousGuideId: 2,
      }),
    ).toEqual([{ key: "guideName", kind: "text", value: "Wayan" }]);
    expect(
      auditDetails("departure.noted", {
        tourId: 66,
        date: "2026-12-10",
        cleared: false,
        length: 44,
      }),
    ).toEqual([]);
    expect(auditDetails("guide.linked", { userId: "CIaYo7V6" })).toEqual([]);
    expect(auditDetails("tour.published", { slug: "desa-manuaba" })).toEqual([]);
  });

  it("types booking statuses, roles and rescheduled dates for translation", () => {
    expect(
      auditDetails("booking.status_changed", {
        code: "EJ-1",
        from: "confirmed",
        status: "cancelled",
      }),
    ).toEqual([
      { key: "from", kind: "bookingStatus", value: "confirmed" },
      { key: "status", kind: "bookingStatus", value: "cancelled" },
    ]);
    expect(auditDetails("user.role_changed", { to: "partner", from: "user" })).toEqual([
      { key: "from", kind: "role", value: "user" },
      { key: "to", kind: "role", value: "partner" },
    ]);
    expect(
      auditDetails("booking.rescheduled", {
        code: "EJ-1",
        from: "2027-01-21",
        to: "2027-01-22",
        rescheduleCount: 1,
      }),
    ).toEqual([
      { key: "from", kind: "date", value: "2027-01-21" },
      { key: "to", kind: "date", value: "2027-01-22" },
      { key: "rescheduleCount", kind: "number", value: 1 },
    ]);
  });

  it("formats money, yes/no, refund reasons, changes and credit fields", () => {
    expect(
      auditDetails("payment.refund_required", {
        reason: "duplicate",
        orderId: "EJ-1-abc",
        bookingId: 7,
        amount: 500000,
      }),
    ).toEqual([
      { key: "reason", kind: "refundReason", value: "duplicate" },
      { key: "amount", kind: "money", value: 500000 },
      { key: "orderId", kind: "text", value: "EJ-1-abc" },
    ]);
    expect(auditDetails("guide.updated", { name: "Wayan", active: false })).toEqual([
      { key: "active", kind: "yesNo", value: false },
    ]);
    expect(auditDetails("credit.updated", { change: "updated", fields: ["author"] })).toEqual([
      { key: "change", kind: "change", value: "updated" },
      { key: "fields", kind: "creditFields", value: ["author"] },
    ]);
  });

  it("leaves the dates of a closure to its name and keeps the rest", () => {
    expect(
      auditDetails("closure.created", {
        tourId: 12,
        from: "2027-01-01",
        to: "2027-01-31",
        days: 31,
        reason: "Nyepi",
        bookings: 2,
      }),
    ).toEqual([
      { key: "days", kind: "number", value: 31 },
      { key: "reason", kind: "text", value: "Nyepi" },
      { key: "bookings", kind: "number", value: 2 },
    ]);
  });

  it("falls back to short text for unexpected values", () => {
    const [item] = auditDetails("closure.created", { reason: "x".repeat(200) });
    expect(item.kind).toBe("text");
    expect(String(item.value)).toHaveLength(60);
    expect(auditDetails("guide.updated", { active: "yes" })).toEqual([
      { key: "active", kind: "text", value: "yes" },
    ]);
  });

  it("handles missing details", () => {
    expect(auditDetails("user.disabled", null)).toEqual([]);
  });
});

describe("auditEntityHref for departures", () => {
  it("links a departure entity to its manifest page", () => {
    expect(
      auditEntityHref({ entityType: "departure", entityId: "12:2026-11-03", details: null }),
    ).toBe("/admin/departures/12/2026-11-03");
    expect(auditEntityHref({ entityType: "departure", entityId: "x:y", details: null })).toBeNull();
  });
});
