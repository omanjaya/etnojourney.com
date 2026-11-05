import { describe, expect, it } from "vitest";
import {
  addDays,
  capacityLoad,
  DEPARTURE_STATUSES,
  departureEntityId,
  departurePath,
  groupByDate,
  guideWhatsAppNumber,
  historyGuideId,
  isIsoDate,
  lastAssignment,
  MAX_RANGE_DAYS,
  manifestChangedBy,
  manifestTotals,
  needsGuide,
  needsGuideOn,
  needsGuideWindow,
  parseDepartureEntityId,
  resolveDateRange,
  sortManifest,
  suggestGuides,
} from "./departure.rules";

describe("departure identity", () => {
  it("formats the audit entity id as tourId:date", () => {
    expect(departureEntityId(12, "2026-10-05")).toBe("12:2026-10-05");
    expect(departurePath(12, "2026-10-05")).toBe("/admin/departures/12/2026-10-05");
  });

  it("parses entity ids back and rejects malformed ones", () => {
    expect(parseDepartureEntityId("12:2026-10-05")).toEqual({ tourId: 12, date: "2026-10-05" });
    expect(parseDepartureEntityId("0:2026-10-05")).toBeNull();
    expect(parseDepartureEntityId("12:2026-02-30")).toBeNull();
    expect(parseDepartureEntityId("12-2026-10-05")).toBeNull();
    expect(parseDepartureEntityId("abc:2026-10-05")).toBeNull();
  });
});

describe("dates", () => {
  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("resolveDateRange", () => {
  const today = "2026-10-02";

  it("defaults to today plus 30 days", () => {
    expect(resolveDateRange({}, today)).toEqual({ from: "2026-10-02", to: "2026-11-01" });
  });

  it("ignores invalid values", () => {
    expect(resolveDateRange({ from: "nope", to: "2026-13-01" }, today)).toEqual({
      from: "2026-10-02",
      to: "2026-11-01",
    });
  });

  it("keeps a valid range and swaps a reversed one", () => {
    expect(resolveDateRange({ from: "2026-10-10", to: "2026-10-20" }, today)).toEqual({
      from: "2026-10-10",
      to: "2026-10-20",
    });
    expect(resolveDateRange({ from: "2026-10-20", to: "2026-10-10" }, today)).toEqual({
      from: "2026-10-10",
      to: "2026-10-20",
    });
  });

  it("fills a missing end from the other one", () => {
    expect(resolveDateRange({ from: "2026-11-01" }, today)).toEqual({
      from: "2026-11-01",
      to: "2026-12-01",
    });
    expect(resolveDateRange({ to: "2026-10-20" }, today)).toEqual({
      from: "2026-10-02",
      to: "2026-10-20",
    });
    // A past-only range looks back instead of producing from > to.
    expect(resolveDateRange({ to: "2026-09-10" }, today)).toEqual({
      from: "2026-08-11",
      to: "2026-09-10",
    });
  });

  it("caps very long ranges", () => {
    const range = resolveDateRange({ from: "2026-01-01", to: "2027-12-31" }, today);
    expect(range).toEqual({ from: "2026-01-01", to: addDays("2026-01-01", MAX_RANGE_DAYS) });
  });

  it("dashboard window is seven days including today", () => {
    expect(needsGuideWindow(today)).toEqual({ from: "2026-10-02", to: "2026-10-08" });
  });
});

describe("capacityLoad", () => {
  it("splits confirmed and pending seats", () => {
    expect(capacityLoad(4, 2, 10)).toEqual({
      confirmed: 4,
      pending: 2,
      booked: 6,
      remaining: 4,
      confirmedPercent: 40,
      pendingPercent: 20,
      overbooked: false,
    });
  });

  it("never draws more than 100% and flags overbooking", () => {
    const load = capacityLoad(8, 5, 10);
    expect(load.confirmedPercent + load.pendingPercent).toBe(100);
    expect(load.remaining).toBe(0);
    expect(load.overbooked).toBe(true);
  });

  it("is full but not overbooked at exactly capacity", () => {
    const load = capacityLoad(10, 0, 10);
    expect(load).toMatchObject({ remaining: 0, overbooked: false, confirmedPercent: 100 });
  });
});

describe("needsGuide", () => {
  it("is true without a guide or with a deactivated one", () => {
    expect(needsGuide({ guideId: null })).toBe(true);
    expect(needsGuide({ guideId: 3, guideActive: false })).toBe(true);
    expect(needsGuide({ guideId: 3, guideActive: true })).toBe(false);
    expect(needsGuide({ guideId: 3 })).toBe(false);
  });

  it("only flags today and later in the agenda: past departures are history", () => {
    const today = "2026-10-10";
    expect(needsGuideOn({ date: "2026-10-10", guideId: null }, today)).toBe(true);
    expect(needsGuideOn({ date: "2026-10-11", guideId: 3, guideActive: false }, today)).toBe(true);
    expect(needsGuideOn({ date: "2026-10-09", guideId: null }, today)).toBe(false);
    expect(needsGuideOn({ date: "2026-10-12", guideId: 3, guideActive: true }, today)).toBe(false);
  });

  it("keeps completed trips on the agenda but not cancelled ones", () => {
    expect(DEPARTURE_STATUSES).toEqual(["pending", "confirmed", "completed"]);
  });
});

describe("manifestChangedBy", () => {
  it("marks the guide's copy stale when a guest drops out or gets confirmed", () => {
    expect(manifestChangedBy("pending", "cancelled")).toBe(true);
    expect(manifestChangedBy("confirmed", "cancelled")).toBe(true);
    expect(manifestChangedBy("pending", "confirmed")).toBe(true);
  });

  it("ignores completing a trip and no-op changes", () => {
    expect(manifestChangedBy("confirmed", "completed")).toBe(false);
    expect(manifestChangedBy("confirmed", "confirmed")).toBe(false);
    expect(manifestChangedBy("cancelled", "cancelled")).toBe(false);
  });
});

describe("departure history", () => {
  const entry = (action: string, at: string, actorName: string | null = "Admin") => ({
    log: { action, details: null, createdAt: new Date(at) },
    actorName,
  });

  it("credits the latest assignment, not later notes or sends", () => {
    const history = [
      entry("departure.assigned", "2026-11-01T01:00:00Z", "Admin A"),
      entry("departure.assigned", "2026-11-02T01:00:00Z", "Admin B"),
      entry("departure.noted", "2026-11-03T01:00:00Z", "Staff C"),
      entry("departure.notified", "2026-11-04T01:00:00Z", "Staff C"),
    ];
    expect(lastAssignment(history)).toEqual({
      name: "Admin B",
      at: new Date("2026-11-02T01:00:00Z"),
    });
  });

  it("has no assigner when the guide was unassigned afterwards or never assigned", () => {
    expect(
      lastAssignment([
        entry("departure.assigned", "2026-11-01T01:00:00Z"),
        entry("departure.unassigned", "2026-11-02T01:00:00Z"),
      ]),
    ).toBeNull();
    expect(lastAssignment([entry("departure.noted", "2026-11-01T01:00:00Z")])).toBeNull();
  });

  it("finds the guide an entry is about, validating the stored id", () => {
    expect(historyGuideId("departure.assigned", { guideId: 3, previousGuideId: 2 })).toBe(3);
    expect(historyGuideId("departure.unassigned", { guideId: null, previousGuideId: 2 })).toBe(2);
    expect(historyGuideId("departure.notified", { guideId: 4, email: "a@b.c" })).toBe(4);
    expect(historyGuideId("departure.noted", { guideId: 4 })).toBeNull();
    expect(historyGuideId("departure.assigned", { guideId: "3" })).toBeNull();
    expect(historyGuideId("departure.assigned", null)).toBeNull();
  });
});

describe("groupByDate", () => {
  it("groups by date ascending and keeps the order within a day", () => {
    const rows = [
      { date: "2026-10-05", tour: "b" },
      { date: "2026-10-03", tour: "a" },
      { date: "2026-10-05", tour: "a" },
    ];
    expect(groupByDate(rows)).toEqual([
      { date: "2026-10-03", departures: [{ date: "2026-10-03", tour: "a" }] },
      {
        date: "2026-10-05",
        departures: [
          { date: "2026-10-05", tour: "b" },
          { date: "2026-10-05", tour: "a" },
        ],
      },
    ]);
    expect(groupByDate([])).toEqual([]);
  });
});

describe("manifest", () => {
  const rows = [
    { id: 5, status: "pending" as const, participants: 2 },
    { id: 3, status: "cancelled" as const, participants: 4 },
    { id: 4, status: "confirmed" as const, participants: 3 },
    { id: 1, status: "confirmed" as const, participants: 1 },
  ];

  it("sorts confirmed first, then pending, then cancelled", () => {
    expect(sortManifest(rows).map((row) => row.id)).toEqual([1, 4, 5, 3]);
  });

  it("totals only the travelling party", () => {
    expect(manifestTotals(rows)).toEqual({
      bookings: 3,
      participants: 6,
      confirmedParticipants: 4,
      pendingParticipants: 2,
      cancelledBookings: 1,
    });
  });
});

describe("suggestGuides", () => {
  it("puts guides covering the destination first, each list by name", () => {
    const { suggested, others } = suggestGuides([
      { name: "Wayan", coversDestination: false },
      { name: "Made", coversDestination: true },
      { name: "Ayu", coversDestination: false },
      { name: "Ketut", coversDestination: true },
    ]);
    expect(suggested.map((g) => g.name)).toEqual(["Ketut", "Made"]);
    expect(others.map((g) => g.name)).toEqual(["Ayu", "Wayan"]);
  });

  it("lists guides already busy on those days after the free ones", () => {
    const { suggested } = suggestGuides([
      { name: "Ayu", coversDestination: true, busyWith: [{ date: "2026-12-10" }] },
      { name: "Made", coversDestination: true, busyWith: [] },
      { name: "Ketut", coversDestination: true },
    ]);
    expect(suggested.map((g) => g.name)).toEqual(["Ketut", "Made", "Ayu"]);
  });
});

describe("guideWhatsAppNumber", () => {
  it("adds the Indonesian country code to local numbers", () => {
    expect(guideWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(guideWhatsAppNumber("+62 812 3456 7890")).toBe("+6281234567890");
    expect(guideWhatsAppNumber(null)).toBeNull();
  });
});
