import { describe, expect, it } from "vitest";
import { auditMessageKey, buildBookingTimeline, timelineLabel } from "./booking-timeline.rules";

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

describe("timelineLabel", () => {
  it("shows the old and new date of a reschedule", () => {
    expect(
      timelineLabel("booking.rescheduled", { from: "2026-12-10", to: "2026-12-17", code: "EJ-1" }),
    ).toEqual({ key: "booking_rescheduled", from: "2026-12-10", to: "2026-12-17" });
  });

  it("shows the refund of a paid traveller cancellation, and none for an unpaid one", () => {
    expect(
      timelineLabel("booking.cancelled_by_traveller", {
        from: "confirmed",
        paid: true,
        percent: 50,
        refundAmount: 700_000,
      }),
    ).toEqual({ key: "booking_cancelled_by_traveller_paid", percent: 50, amount: 700_000 });
    expect(
      timelineLabel("booking.cancelled_by_traveller", { paid: false, percent: 0, refundAmount: 0 }),
    ).toEqual({ key: "booking_cancelled_by_traveller" });
  });

  it("uses the partial refund amount when there is one", () => {
    expect(
      timelineLabel("payment.refund_required", { amount: 1_400_000, refundAmount: 700_000 }),
    ).toEqual({ key: "payment_refund_required", amount: 700_000 });
    expect(timelineLabel("payment.refund_required", { amount: 1_400_000 })).toEqual({
      key: "payment_refund_required",
      amount: 1_400_000,
    });
    expect(timelineLabel("payment.refunded", { amount: 1_400_000, refundAmount: 700_000 })).toEqual(
      { key: "payment_refunded", amount: 700_000 },
    );
  });

  it("labels status changes, notes and automatic releases", () => {
    expect(timelineLabel("booking.status_changed", { from: "pending", status: "confirmed" })).toEqual(
      { key: "booking_status_changed", status: "confirmed" },
    );
    expect(timelineLabel("booking.note_added", null)).toEqual({ key: "booking_note_added" });
    expect(timelineLabel("booking.expired", { code: "EJ-1" })).toEqual({ key: "booking_expired" });
  });

  it("returns null for unknown verbs or unreadable details", () => {
    expect(timelineLabel("tour.updated", { slug: "x" })).toBeNull();
    expect(timelineLabel("booking.status_changed", { status: "lost" })).toBeNull();
    expect(timelineLabel("booking.rescheduled", { from: "soon" })).toBeNull();
    expect(timelineLabel("payment.refunded", null)).toBeNull();
  });
});
