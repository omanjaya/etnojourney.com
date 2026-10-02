import { describe, expect, it } from "vitest";
import { auditEntityHref, compactDetails } from "./rules";

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
  });

  it("refuses ids that could escape the path", () => {
    expect(
      auditEntityHref({ entityType: "tour", entityId: "1/../../x", details: null }),
    ).toBeNull();
    expect(auditEntityHref({ entityType: "user", entityId: "a/b", details: null })).toBeNull();
  });

  it("returns null for entities without a page", () => {
    expect(auditEntityHref({ entityType: "review", entityId: "1", details: null })).toBeNull();
    expect(auditEntityHref({ entityType: "closure", entityId: "1", details: null })).toBeNull();
  });
});

describe("compactDetails", () => {
  it("drops the code and empty values and stringifies the rest", () => {
    expect(
      compactDetails({ code: "EJ-1", from: "user", to: "staff", note: null, n: 3, o: { a: 1 } }),
    ).toEqual([
      ["from", "user"],
      ["to", "staff"],
      ["n", "3"],
      ["o", '{"a":1}'],
    ]);
  });

  it("truncates long values", () => {
    const [[, value]] = compactDetails({ text: "x".repeat(200) });
    expect(value).toHaveLength(60);
    expect(value.endsWith("…")).toBe(true);
  });

  it("handles missing details", () => {
    expect(compactDetails(null)).toEqual([]);
  });
});
