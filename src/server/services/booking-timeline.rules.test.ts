import { describe, expect, it } from "vitest";
import { auditMessageKey, buildBookingTimeline } from "./booking-timeline.rules";

const at = (iso: string) => new Date(iso);

describe("buildBookingTimeline", () => {
  it("always starts the history with the booking's creation", () => {
    const events = buildBookingTimeline({
      createdAt: at("2026-10-01T02:00:00Z"),
      createdBy: "Nadia",
      payments: [],
      audit: [],
    });
    expect(events).toEqual([
      { key: "created", kind: "created", at: at("2026-10-01T02:00:00Z"), actorName: "Nadia" },
    ]);
  });

  it("merges paid payments and audit entries, newest first", () => {
    const events = buildBookingTimeline({
      createdAt: at("2026-10-01T02:00:00Z"),
      createdBy: "Nadia",
      payments: [
        { id: 7, orderId: "EJ-A-1", amount: 500_000, paidAt: at("2026-10-01T03:00:00Z") },
        { id: 8, orderId: "EJ-A-2", amount: 500_000, paidAt: null },
      ],
      audit: [
        {
          id: 1,
          action: "booking.note_added",
          details: null,
          createdAt: at("2026-10-02T09:00:00Z"),
          actorName: "Admin",
        },
        {
          id: 2,
          action: "booking.status_changed",
          details: { status: "completed" },
          createdAt: at("2026-10-01T05:00:00Z"),
          actorName: null,
        },
      ],
    });
    expect(events.map((e) => e.key)).toEqual(["audit-1", "audit-2", "paid-7", "created"]);
  });

  it("puts creation last when other events share its timestamp", () => {
    const same = at("2026-10-01T02:00:00Z");
    const events = buildBookingTimeline({
      createdAt: same,
      createdBy: "Nadia",
      payments: [],
      audit: [
        { id: 3, action: "booking.note_added", details: null, createdAt: same, actorName: "A" },
      ],
    });
    expect(events.map((e) => e.key)).toEqual(["audit-3", "created"]);
  });

  it("orders same-instant audit entries newest insert first", () => {
    const same = at("2026-10-01T04:00:00Z");
    const events = buildBookingTimeline({
      createdAt: at("2026-10-01T02:00:00Z"),
      createdBy: "Nadia",
      payments: [],
      audit: [
        { id: 4, action: "booking.note_added", details: null, createdAt: same, actorName: "A" },
        { id: 5, action: "booking.note_added", details: null, createdAt: same, actorName: "A" },
      ],
    });
    expect(events.map((e) => e.key)).toEqual(["audit-5", "audit-4", "created"]);
  });
});

describe("auditMessageKey", () => {
  it("replaces dots so the action can be used as a message key", () => {
    expect(auditMessageKey("payment.refund_required")).toBe("payment_refund_required");
  });
});
